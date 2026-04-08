// デフォルトの初期状態定義 (engine.htmlから抽出)
const defaultSwitchStateTemplate = {
    mode: 'user', // user, privileged, config, interface, vlan, line, acl
    hostname: 'Switch',
    interfaces: {},
    vlans: { '1': { name: 'default', status: 'active' } },
    currentInterface: null,
    currentVlan: null,
    currentLine: null,
    currentAcl: null,
    configStack: [],
    cdpEnabled: true,     // CDP機能のグローバル状態
    lldpEnabled: false,   // LLDP機能のグローバル状態
    lldpTransmit: false,  // LLDP送信
    lldpReceive: false,   // LLDP受信
    runningConfig: {
        hostname: 'Switch',
        interfaces: {},
        vlans: { '1': { name: 'default', status: 'active' } },
        security: {
            users: {},
            portSecurity: {},  // ポートセキュリティ設定を追加
            sshKeysGenerated: false,
            domainName: null,
            sshVersion: 1
        },
        lines: {},
        acls: {},
        cdp: {
            enabled: true,  // グローバルCDP状態
            interfaces: {}  // インターフェースごとのCDP状態
        },
        lldp: {
            enabled: false,  // グローバルLLDP状態
            transmit: false, // LLDP送信状態
            receive: false,  // LLDP受信状態
            interfaces: {}   // インターフェースごとのLLDP状態
        },
        ntp: {
            server: null
        },
        dhcpSnooping: {
            enabled: false,
            vlans: [],
            verifyMac: false,
            informationOption: true
        },
        startupConfig: null  // copy run start 用に追加
    }
};

const defaultRouterStateTemplate = {
    mode: 'user', // user, privileged, config, interface, line, acl
    hostname: 'Router',
    interfaces: {},
    currentInterface: null,
    currentLine: null,
    currentAcl: null,
    configStack: [],
    cdpEnabled: true,     // CDP機能のグローバル状態
    lldpEnabled: false,   // LLDP機能のグローバル状態
    runningConfig: {
        hostname: 'Router',
        interfaces: {},
        routing: {
            staticRoutes: [],
            ipv6Routes: [] // IPv6ルートの配列
        },
        security: {
            users: {},
            portSecurity: {},  // ポートセキュリティ設定を追加
            sshKeysGenerated: false,
            domainName: null,
            sshVersion: 1
        },
        lines: {},
        acls: {},
        cdp: {
            enabled: true,  // グローバルCDP状態
            interfaces: {}  // インターフェースごとのCDP状態
        },
        lldp: {
            enabled: false,  // グローバルLLDP状態
            transmit: false, // LLDP送信状態
            receive: false,  // LLDP受信状態
            interfaces: {}   // インターフェースごとのLLDP状態
        },
        ntp: {
            server: null
        },
        nat: {
            insideSourceList: null,
            interfaceOverload: null
        },
        startupConfig: null  // copy run start 用に追加
    }
};

// アプリケーション状態管理
const appState = {
    currentScenarioId: null,
    currentDeviceName: null, // 現在操作中のデバイス名
    devices: {}, // { "SW1": stateObj, "R1": stateObj }
    pendingStateSave: null, // 状態保存待ちの許容
    examVars: null, // 試験モード用の動的変数保存先
    sshSourceDevice: null
};

// ▼ URLパラメータ取得ロジック ▼
const urlParams = new URLSearchParams(window.location.search);
let sceneId = urlParams.get('scenario');
const isPracticeMode = urlParams.get('mode') === 'practice';
const isExamMode = urlParams.get('mode') === 'exam';

// iframeのロード待ち
let engineReady = false;
const termFrame = document.getElementById('term-frame');

// --- PostMessage Communication Setup ---
window.addEventListener('message', (e) => {
    // セキュリティチェック: 実際は '*' だが、意図しないメッセージをフィルタ
    if (!e.data || !e.data.type) return;

    switch (e.data.type) {
        case 'ENGINE_READY':
            console.log('Engine reported ready via postMessage');
            engineReady = true;
            // 初期デバイスがあればロード
            if (appState.currentDeviceName) {
                loadDeviceToEngine(appState.currentDeviceName);
            }
            break;

        case 'STATE_RESPONSE':
            // エンジンから現在の状態が返ってきた
            if (appState.currentDeviceName && appState.devices[appState.currentDeviceName]) {
                console.log('Received state for', appState.currentDeviceName);
                appState.devices[appState.currentDeviceName].state = e.data.payload;

                // pending actionがあれば実行 (例: saveしてswitchする場合)
                if (appState.pendingAction) {
                    const action = appState.pendingAction;

                    // タイムアウト解除
                    if (action.timeoutId) {
                        clearTimeout(action.timeoutId);
                    }

                    appState.pendingAction = null;

                    if (action.type === 'SWITCH') {
                        loadDeviceToEngine(action.targetName, action.isSsh);
                        updateDeviceListUI(action.targetName);
                    } else if (action.type === 'VALIDATE') {
                        performValidation();
                    }
                }
            }
            break;

        case 'RESET_REQUEST':
            console.log('Reset request received from engine');
            if (confirm('本当にリセットしますか？')) {
                // シナリオを再初期化
                if (appState.currentScenarioId) {
                    initScenario(appState.currentScenarioId);
                    // エンジン側にもリセット確認を送る
                    if (termFrame && termFrame.contentWindow) {
                        termFrame.contentWindow.postMessage({ type: 'RESET_CONFIRMED' }, '*');
                    }
                }
            }
            break;


        case 'SSH_CHECK': {
            // SSH接続要求を処理
            const targetIp = e.data.targetIp;
            const user = e.data.user;

            // IPアドレスからデバイスを探す
            let targetDevice = null;
            let targetDeviceName = null;

            // 各デバイスのインターフェースIPをチェック
            Object.keys(appState.devices).forEach(devName => {
                const dev = appState.devices[devName];
                if (dev.state && dev.state.runningConfig && dev.state.runningConfig.interfaces) {
                    Object.values(dev.state.runningConfig.interfaces).forEach(iface => {
                        if (iface.ip === targetIp) {
                            targetDevice = dev;
                            targetDeviceName = devName;
                        }
                    });
                }
            });

            // SSH接続の可否を判定
            let sshResponse = { success: false, message: '' };

            if (!targetDevice) {
                sshResponse.message = `% Connection refused: Host ${targetIp} unreachable (IP not assigned to any device)`;
            } else {
                const security = targetDevice.state.runningConfig.security;
                const lines = targetDevice.state.runningConfig.lines;

                // SSH設定のチェック
                const hasDomain = security.domainName != null;
                const hasKeys = security.sshKeysGenerated === true;
                const hasUser = security.users[user] != null;

                // VTY設定のチェック
                let vtyConfigured = false;
                let vtyAllowsSSH = false;
                let vtyUsesLocal = false;

                Object.keys(lines).forEach(lineKey => {
                    if (lineKey.startsWith('vty')) {
                        vtyConfigured = true;
                        const lineConfig = lines[lineKey];
                        if (lineConfig.transport && lineConfig.transport.input &&
                            lineConfig.transport.input.includes('ssh')) {
                            vtyAllowsSSH = true;
                        }
                        if (lineConfig.loginMethod === 'local') {
                            vtyUsesLocal = true;
                        }
                    }
                });

                const hasVersion = security.sshVersion === 2;

                console.log('SSH Debug:', {
                    targetIp, user,
                    targetDevice: targetDeviceName,
                    hasDomain, hasKeys, hasVersion,
                    vtyConfigured, vtyAllowsSSH,
                    hasUser, vtyUsesLocal,
                    sshVersion: security.sshVersion
                });

                if (!hasDomain || !hasKeys || !hasVersion) {
                    sshResponse.message = `% Connection refused by remote host (Security: D=${hasDomain}, K=${hasKeys}, V=${hasVersion})`;
                } else if (!vtyConfigured || !vtyAllowsSSH) {
                    sshResponse.message = `% Connection refused by remote host (VTY: Config=${vtyConfigured}, SSH=${vtyAllowsSSH})`;
                } else if (!hasUser || !vtyUsesLocal) {
                    sshResponse.success = true;
                    sshResponse.needsPassword = true;
                    sshResponse.targetDeviceName = targetDeviceName;
                } else {
                    sshResponse.success = true;
                    sshResponse.needsPassword = true;
                    sshResponse.targetDeviceName = targetDeviceName;
                    sshResponse.validUser = user;
                    sshResponse.validPassword = security.users[user].password;
                }
            }

            // エンジンに応答を返す
            termFrame.contentWindow.postMessage({
                type: 'SSH_RESULT',
                payload: Object.assign({ targetHostname: targetDeviceName }, sshResponse)
            }, '*');
        }
            break;

        case 'HELPER_ADDRESS_SET':
            // R3の状態を更新 (Problem 3の動的挙動用)
            if (e.data.value === '10.0.12.2' && appState.devices['R3']) {
                appState.devices['R3'].state.runningConfig.dhcpAssigned = true;
                console.log('DHCP assigned to R3 due to helper-address configuration on Sw1');
            }
            break;

        case 'SWITCH_DEVICE':
            if (e.data.targetName) {
                // SSH接続時のソースデバイス記録
                if (e.data.isSsh) {
                    appState.sshSourceDevice = appState.currentDeviceName;
                }
                limitSwitchDevice(e.data.targetName, e.data.isSsh);
            }
            break;

        case 'SSH_EXIT':
            if (appState.sshSourceDevice) {
                const target = appState.sshSourceDevice;
                appState.sshSourceDevice = null;
                limitSwitchDevice(target, false);
            }
            break;

        case 'PING_CHECK': {
            const targetIp = e.data.targetIp;
            const sourceDev = e.data.sourceDeviceName;
            const currentState = e.data.currentState;

            // エンジンから送られてきた最新の状態を反映
            if (sourceDev && currentState && appState.devices[sourceDev]) {
                appState.devices[sourceDev].state = currentState;
                console.log('Updated state from PING_CHECK for', sourceDev);
            }

            if (targetIp === '209.165.200.224' && sourceDev === 'SW-1') {
                const r2 = appState.devices['R2'];
                if (r2) {
                    const conf = r2.state.runningConfig;
                    const hasOutside = conf.interfaces['Ethernet0/0'] && conf.interfaces['Ethernet0/0'].nat === 'outside';
                    const hasInside = conf.interfaces['Ethernet0/1'] && conf.interfaces['Ethernet0/1'].nat === 'inside';
                    const hasNatList = conf.nat.insideSourceList === '1';
                    const hasNatIf = conf.nat.interfaceOverload === 'Ethernet0/0';
                    const hasAcl = conf.acls['1'] && conf.acls['1'].entries.some(ent => ent.action === 'permit' && ent.source.includes('10.0.12.1'));

                    if (hasOutside && hasInside && hasNatList && hasNatIf && hasAcl) {
                        termFrame.contentWindow.postMessage({
                            type: 'PING_RESULT',
                            payload: { targetIp: targetIp, sequence: '..!!!', rate: 60 }
                        }, '*');
                        break;
                    }
                }
            } else if (targetIp === '10.200.220.6') {
                const r5 = appState.devices['R5'];
                const r1 = appState.devices['R1'];
                const r2 = appState.devices['R2'];

                if (r5 && r1) {
                    const r5Routes = r5.state.runningConfig.routing.staticRoutes || [];
                    const r1Routes = r1.state.runningConfig.routing.staticRoutes || [];
                    const r1Eth01 = r1.state.runningConfig.interfaces['Ethernet0/1'] || {};

                    const r5ToR1 = r5Routes.some(r => r.destination === '10.200.220.6' && r.nextHop === '10.100.110.1');
                    const r1ToR3 = r1Routes.some(r => r.destination === '0.0.0.0' && r.nextHop === '10.133.13.3');
                    const r1ToR2 = r1Routes.some(r => r.destination === '0.0.0.0' && r.nextHop === '10.122.12.2');

                    const r1Eth01Up = r1Eth01.status === 'up';

                    // Path 1: Primary
                    if (r5ToR1 && r1ToR3 && r1Eth01Up) {
                        termFrame.contentWindow.postMessage({
                            type: 'PING_RESULT',
                            payload: { targetIp: targetIp, sequence: '!!!!!', rate: 100 }
                        }, '*');
                        break;
                    }

                    // Path 2: Backup
                    if (r5ToR1 && r1ToR2 && !r1Eth01Up && r2) {
                        const r2Routes = r2.state.runningConfig.routing.staticRoutes || [];
                        const r2ToR1 = r2Routes.some(r => r.destination === '10.100.110.0' && r.nextHop === '10.122.12.1');
                        if (r2ToR1) {
                            termFrame.contentWindow.postMessage({
                                type: 'PING_RESULT',
                                payload: { targetIp: targetIp, sequence: '!!!!!', rate: 100 }
                            }, '*');
                            break;
                        }
                    }
                }
            }
            // Default failure
            termFrame.contentWindow.postMessage({
                type: 'PING_RESULT',
                payload: { targetIp: targetIp, sequence: '.....', rate: 0 }
            }, '*');
            break;
        }

        case 'TRACEROUTE_CHECK': {
            const targetIp = e.data.targetIp;
            const sourceDev = e.data.sourceDeviceName;
            const currentState = e.data.currentState;

            // エンジンから送られてきた最新の状態を反映
            if (sourceDev && currentState && appState.devices[sourceDev]) {
                appState.devices[sourceDev].state = currentState;
                console.log('Updated state from TRACEROUTE_CHECK for', sourceDev);
            }

            let hops = [];

            if (targetIp === '10.200.220.6') {
                const r5 = appState.devices['R5'];
                const r1 = appState.devices['R1'];
                const r2 = appState.devices['R2'];

                if (r5 && r1) {
                    const r5Routes = r5.state.runningConfig.routing.staticRoutes || [];
                    const r1Routes = r1.state.runningConfig.routing.staticRoutes || [];
                    const r1Eth01 = r1.state.runningConfig.interfaces['Ethernet0/1'] || {};

                    const r5ToR1 = r5Routes.some(r => r.destination === '10.200.220.6' && r.nextHop === '10.100.110.1');
                    const r1ToR3 = r1Routes.some(r => r.destination === '0.0.0.0' && r.nextHop === '10.133.13.3');
                    const r1ToR2 = r1Routes.some(r => r.destination === '0.0.0.0' && r.nextHop === '10.122.12.2');
                    const r1Eth01Up = r1Eth01.status === 'up';

                    if (r5ToR1 && r1ToR3 && r1Eth01Up) {
                        hops = [
                            '1 10.100.110.1 0ms 0ms 0ms',
                            '2 10.133.13.3 0 ms 0 ms 0 ms',
                            '3 10.34.34.4 0ms 0ms 0ms',
                            '4 10.200.220.6 0ms 0ms 0ms'
                        ];
                    } else if (r5ToR1 && r1ToR2 && !r1Eth01Up && r2) {
                        const r2Routes = r2.state.runningConfig.routing.staticRoutes || [];
                        const r2ToR1 = r2Routes.some(r => r.destination === '10.100.110.0' && r.nextHop === '10.122.12.1');
                        if (r2ToR1) {
                            hops = [
                                '1 10.100.110.1 0ms 0ms 0ms',
                                '2 10.122.12.2 0 ms 0 ms 0 ms',
                                '3 10.34.24.4 0ms 0ms 0ms',
                                '4 10.200.220.6 0ms 0ms 0ms'
                            ];
                        }
                    }
                }
            }

            if (hops.length === 0) {
                hops = [
                    '1 ***',
                    '2 ***',
                    '3 ***',
                    '4 ***'
                ];
            }

            termFrame.contentWindow.postMessage({
                type: 'TRACEROUTE_RESULT',
                payload: { targetIp: targetIp, hops: hops }
            }, '*');
            break;
        }
    }
});

termFrame.onload = function () {
    console.log('Engine iframe onload');
    // postMessageのENGINE_READYを待つが、万が一のためにフォーカス試行
    try {
        termFrame.contentWindow.focus();
    } catch (e) { /* ignore */ }
};

// オブジェクトのディープコピー
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 初期化処理
function initScenario(scenarioId) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    appState.currentScenarioId = scenarioId;
    appState.devices = {};
    appState.examVars = null; // ★変数クリア

    // ★試験モードの場合、動的変数を生成・タスクと判定を上書き
    if (isExamMode && typeof scenario.generateVars === 'function') {
        appState.examVars = scenario.generateVars();
        if (typeof scenario.getTasks === 'function') {
            scenario.tasks = scenario.getTasks(appState.examVars);
        }
        if (typeof scenario.getValidations === 'function') {
            scenario.validations = scenario.getValidations(appState.examVars);
        }
    }

    // デバイスリストUIの構築 (Right Pane Header)
    const deviceListEl = document.getElementById('device-list');
    deviceListEl.innerHTML = '';

    // 左ペインのコンテンツ更新 (Guidelines)
    const descEl = document.getElementById('scenario-desc');
    if (descEl) descEl.innerHTML = scenario.description || scenario.desc || '';

    // ▼ ▼ トポロジ図の表示 (Topologyタブ) ▼ ▼
    const staticImg = document.getElementById('scenario-image');
    const dynamicContainer = document.getElementById('topology-container');
    
    // 試験モードかつ変数が生成されていれば、動的表示(重ね合わせ)を利用
    if (isExamMode && appState.examVars && dynamicContainer) {
        if (staticImg) staticImg.style.display = 'none';
        dynamicContainer.style.display = 'inline-block';
        
        const baseImg = document.getElementById('scenario-image-base');
        if (baseImg && scenario.image) baseImg.src = scenario.image;

        // 問題ごとにOverlay用のIDに値をセット (例: Q4)
        if (scenarioId === 'new_q4_exam') {
            const ipv4El = document.getElementById('topo-q4-ipv4');
            const ipv6El = document.getElementById('topo-q4-ipv6');
            if (ipv4El) ipv4El.textContent = appState.examVars.ipv4Subnet;
            if (ipv6El) ipv6El.textContent = appState.examVars.ipv6Subnet;
        }
    } else {
        // 通常の静的表示
        if (dynamicContainer) dynamicContainer.style.display = 'none';
        if (staticImg) {
            if (scenario.image) {
                staticImg.src = scenario.image;
                staticImg.style.display = 'block';
            } else {
                staticImg.style.display = 'none';
                staticImg.src = '';
            }
        }
    }

    // 判定ログクリア (Validationタブ内)
    const logEl = document.getElementById('validation-log');
    if (logEl) {
        logEl.textContent = '';
        logEl.style.color = '#333';
    }

    // ▼ ▼ タスク表示 (Tasksタブ) - 練習モード対応 ▼ ▼
    const tasksEl = document.getElementById('scenario-tasks');
    if (tasksEl) {
        let tasksHtml = '';
        // ★既存問題 (tasksHtmlが直接記述されている場合) を優先
        if (scenario.tasksHtml && !isExamMode) {
            tasksHtml = scenario.tasksHtml;
        } 
        // 配列形式のタスクの場合
        else if (scenario.tasks && Array.isArray(scenario.tasks) && scenario.tasks.length > 0) {
            tasksHtml = '<ol>';
            scenario.tasks.forEach((t, index) => {
                tasksHtml += `<li>${t}</li>`;
                
                // 練習モード判定：解答コマンドを表示
                if (isPracticeMode) {
                    let answer = null;
                    if (appState.examVars && typeof scenario.getAnswers === 'function') {
                        // 試験モードかつ練習モードの場合 (動的解答)
                        const dynamicAnswers = scenario.getAnswers(appState.examVars);
                        answer = dynamicAnswers[index];
                    } else if (scenario.answers && scenario.answers[index]) {
                        // 通常の練習モード (静的解答)
                        answer = scenario.answers[index];
                    }
                    
                    if (answer) {
                        tasksHtml += `
                            <div class="command-hint-box">
                                <span class="command-hint-label">💡 解答コマンド</span>
                                <pre class="command-hint-code">${answer}</pre>
                            </div>
                        `;
                    }
                }
            });
            tasksHtml += '</ol>';
        } else {
            tasksHtml = '<p>Refer to the Guidelines or Topology for tasks.</p>';
        }
        tasksEl.innerHTML = tasksHtml;
    }

    // タブの初期化 (ワンタイム)
    initTabs();

    // デバイス初期化
    scenario.devices.forEach((dev, index) => {
        // ステート生成
        let state;
        if (dev.type === 'switch') {
            state = deepCopy(defaultSwitchStateTemplate);
            state.hostname = dev.name;
            state.runningConfig.hostname = dev.name;
        } else {
            state = deepCopy(defaultRouterStateTemplate);
            state.hostname = dev.name;
            state.runningConfig.hostname = dev.name;
        }
        // ホスト名の初期設定
        state.hostname = dev.name;
        state.runningConfig.hostname = dev.name;

        appState.devices[dev.name] = {
            type: dev.type,
            state: state
        };

        // 物理ポートの初期化 (厳格モード用)
        if (dev.physicalPorts && Array.isArray(dev.physicalPorts)) {
            state.strictPorts = true;
            dev.physicalPorts.forEach(port => {
                if (dev.type === 'switch') {
                    state.runningConfig.interfaces[port] = {
                        status: 'shutdown',
                        ip: null,
                        mask: null,
                        ipv6Addresses: [],
                        switchport: {
                            mode: null,
                            access_vlan: 1,
                            voice_vlan: null,
                            trunk_encapsulation: null,
                            trunk_allowed_vlans: 'all',
                            trunk_native_vlan: 1
                        }
                    };
                } else {
                    state.runningConfig.interfaces[port] = {
                        status: 'shutdown',
                        ip: null,
                        mask: null,
                        ipv6Addresses: []
                    };
                }
            });
        }

        // initialStateの適用 (再帰的マージ)
        if (dev.initialState) {
            const merge = (target, source) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            merge(state, dev.initialState);
        }

        // UIボタン作成 (タブスタイル)
        const btn = document.createElement('button');
        btn.textContent = dev.name;
        btn.className = 'device-tab-btn'; // クラス変更
        btn.onclick = () => limitSwitchDevice(dev.name);
        if (index === 0) btn.classList.add('active'); // 最初をアクティブに
        deviceListEl.appendChild(btn);
    });

    // 最初のデバイスを選択
    if (scenario.devices.length > 0) {
        appState.currentDeviceName = scenario.devices[0].name;
        // engineReadyになったらロードされる
        if (engineReady) {
            loadDeviceToEngine(appState.currentDeviceName);
        }
    }
}

// タブ初期化ロジック
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブクラスの除去
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // クリックされたタブをアクティブに
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// プログラムでタブを切り替える関数
function switchToTab(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // アクティブクラスの除去
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    // 指定されたタブをアクティブに
    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });

    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}


// デバイス切り替え処理 (非同期State保存を含むためラップ)
function limitSwitchDevice(nextDeviceName, isSsh = false) {
    if (appState.currentDeviceName === nextDeviceName) return;

    // 現在の状態を保存要求してから、完了後に切り替える
    if (appState.currentDeviceName) {
        requestStateFromEngine(); // 非同期
        appState.pendingAction = { type: 'SWITCH', targetName: nextDeviceName, isSsh: isSsh };
    } else {
        loadDeviceToEngine(nextDeviceName, isSsh);
        updateDeviceListUI(nextDeviceName);
    }
}

// エンジンに状態を要求 (保存のため)
function requestStateFromEngine() {
    const frameWindow = termFrame.contentWindow;
    if (frameWindow) {
        frameWindow.postMessage({ type: 'GET_STATE' }, '*');
    }
}

// エンジンに状態をロード
function loadDeviceToEngine(deviceName, isSsh = false) {
    const target = appState.devices[deviceName];
    if (!target) return;

    appState.currentDeviceName = deviceName;
    const frameWindow = termFrame.contentWindow;

    // --- Scenario Dependency Resolution ---
    resolveScenarioDependencies(appState.currentScenarioId);

    if (frameWindow) {
        const scenario = scenarios.find(s => s.id === appState.currentScenarioId);
        const topology = scenario ? scenario.topology : null;

        frameWindow.postMessage({
            type: 'LOAD_STATE',
            payload: target.state,
            deviceType: target.type,
            topology: topology,
            isSsh: isSsh
        }, '*');

        setTimeout(() => {
            frameWindow.postMessage({ type: 'FOCUS' }, '*');
        }, 100);
    }
}

// --- レイアウトのリサイズ機能 ---
(function () {
    const resizer = document.getElementById('layout-resizer');
    const leftPane = document.querySelector('.info-pane');
    let isResizing = false;

    if (resizer && leftPane) {
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.classList.add('resizing');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResizing);
        });

        function handleMouseMove(e) {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 300) newWidth = 300;
            if (newWidth > window.innerWidth - 300) newWidth = window.innerWidth - 300;
            leftPane.style.width = newWidth + 'px';
        }

        function stopResizing() {
            isResizing = false;
            document.body.classList.remove('resizing');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        }
    }
})();

function updateDeviceListUI(activeName) {
    const buttons = document.querySelectorAll('#device-list button');
    buttons.forEach(btn => {
        if (btn.textContent === activeName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// シナリオ依存の動的状態解決
function resolveScenarioDependencies(scenarioId) {
    if (scenarioId !== 'prob3') return;

    const sw1 = appState.devices['SW-1'];
    const r3 = appState.devices['R3'];
    const r2 = appState.devices['R2'];

    if (sw1 && sw1.state && r3 && r3.state) {
        const interfaces = sw1.state.runningConfig.interfaces || {};
        const vlan101 = interfaces['Vlan101'];

        if (vlan101 && vlan101.ipHelper === '10.0.12.2') {
            if (!r3.state.runningConfig.interfaces['Ethernet0/0']) {
                r3.state.runningConfig.interfaces['Ethernet0/0'] = {};
            }
            r3.state.runningConfig.interfaces['Ethernet0/0'].ip = '10.101.20.3';
            r3.state.runningConfig.interfaces['Ethernet0/0'].mask = '255.255.255.0';
            r3.state.runningConfig.interfaces['Ethernet0/0'].method = 'DHCP';
        } else {
            if (r3.state.runningConfig.interfaces['Ethernet0/0']) {
                r3.state.runningConfig.interfaces['Ethernet0/0'].ip = null;
                r3.state.runningConfig.interfaces['Ethernet0/0'].mask = null;
                r3.state.runningConfig.interfaces['Ethernet0/0'].method = 'unset';
            }
        }
    }

    if (sw1 && sw1.state && r2 && r2.state) {
        const security = sw1.state.runningConfig.security;
        const lines = sw1.state.runningConfig.lines;

        let isSshReady = false;
        if (security.domainName && security.sshKeysGenerated &&
            security.users['admin'] &&
            lines['vty 0 4'] && lines['vty 0 4'].transport && lines['vty 0 4'].transport.input && lines['vty 0 4'].transport.input.includes('ssh')) {
            isSshReady = true;
        }

        if (!r2.state.simulationFlags) {
            r2.state.simulationFlags = { sshTarget: {}, sshPassword: {} };
        }

        if (isSshReady) {
            r2.state.simulationFlags.sshTarget['10.0.12.1'] = true;
            r2.state.simulationFlags.sshPassword['10.0.12.1'] = 'StrongPass!';
        } else {
            r2.state.simulationFlags.sshTarget['10.0.12.1'] = false;
        }
    }
}


// 判定処理開始
function validateScenario() {
    console.log('validateScenario called');
    switchToTab('validation');

    const logEl = document.getElementById('validation-log');
    if (!logEl) return;

    logEl.textContent = "データを取得中... (Engine State Request)\n";
    logEl.style.color = '#666';

    const scenario = scenarios.find(s => s.id === appState.currentScenarioId);
    if (!scenario) {
        logEl.textContent = `[Error] Scenario ID '${appState.currentScenarioId}' not found.\n`;
        logEl.style.color = 'red';
        return;
    }

    const timeoutId = setTimeout(() => {
        if (appState.pendingAction && appState.pendingAction.type === 'VALIDATE') {
            logEl.textContent += "[Warning] エンジンからの応答が遅いため、現在の保存済みデータで判定を行います。\n";
            appState.pendingAction = null;
            performValidation();
        }
    }, 2000);

    try {
        requestStateFromEngine();
        appState.pendingAction = { type: 'VALIDATE', timeoutId: timeoutId };
    } catch (e) {
        logEl.textContent += `[Error] データ要求に失敗: ${e.message}\n`;
        performValidation();
    }
}

// 実際の判定ロジック
function performValidation() {
    console.log('performValidation started');
    const scenario = scenarios.find(s => s.id === appState.currentScenarioId);
    if (!scenario) return;

    switchToTab('validation');

    const logEl = document.getElementById('validation-log');
    if (!logEl) return;
    
    logEl.innerHTML = '<div class="status-msg">判定を開始します...</div>';
    logEl.style.color = '#333';

    if (!scenario.validations) {
        logEl.innerHTML = '<div class="status-msg">このシナリオには判定設定がありません。</div>';
        return;
    }

    try {
        let ngMessages = [];

        scenario.validations.forEach(val => {
            const targetDevice = appState.devices[val.device];
            if (!targetDevice) {
                ngMessages.push(`[Error] Device ${val.device} not found (Initialize failed?)`);
                return;
            }

            let actualValue;
            try {
                actualValue = resolvePath(targetDevice.state, val.path);
            } catch (err) {
                ngMessages.push(`[System Error] Path resolution failed for ${val.path}`);
                console.error(err);
                return;
            }

            if (typeof val.condition === 'function') {
                if (!val.condition(actualValue)) {
                    ngMessages.push(`<span class="ng-tag">[NG]</span> ${val.message} (Value: ${actualValue})`);
                }
            }
            else if (val.match === 'contains') {
                const isMatch = Array.isArray(actualValue) && actualValue.some(item => {
                    return Object.keys(val.expected).every(key => {
                        return item && String(item[key]) === String(val.expected[key]);
                    });
                });
                if (!isMatch) {
                    ngMessages.push(`<span class="ng-tag">[NG]</span> ${val.message}`);
                }
            }
            else if (val.hasOwnProperty('expected')) {
                if (!compareValues(actualValue, val.expected)) {
                    const displayActual = Array.isArray(actualValue) ? `[${actualValue.join(',')}]` : actualValue;
                    const displayExpected = Array.isArray(val.expected) ? `[${val.expected.join(',')}]` : val.expected;
                    ngMessages.push(`<span class="ng-tag">[NG]</span> ${val.message} <br><small style="color:#777">Expected: ${displayExpected}, Found: ${displayActual}</small>`);
                }
            }
        });

        if (ngMessages.length === 0) {
            logEl.innerHTML += '<div style="color: #4caf50; font-weight: bold; margin-top: 10px;">すべて正解です！素晴らしい！</div>';
        } else {
            let html = '<ul>';
            ngMessages.forEach(msg => {
                html += `<li>${msg}</li>`;
            });
            html += '</ul>';
            html += '<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">';
            html += '<div style="color: #ff5252; font-weight: bold;">不正解の項目があります。設定を見直してください。</div>';
            logEl.innerHTML += html;
        }

    } catch (e) {
        console.error('Validation Error:', e);
        if (logEl) logEl.textContent += `\n[System Error] 判定中にエラーが発生しました: ${e.message}`;
    }
}

function compareValues(actual, expected) {
    if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) return false;
        if (actual.length !== expected.length) return false;
        return expected.every(item => actual.includes(item));
    }
    return String(actual) === String(expected);
}

function resolvePath(obj, path) {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
}

// イベントリスナ
document.getElementById('check-answer-btn').addEventListener('click', validateScenario);
document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// 初期化実行 
if (!sceneId) {
    console.warn('No scenario ID provided in URL. Defaulting to question1.');
    sceneId = 'question1'; 
}

if (sceneId) {
    if (typeof scenarios !== 'undefined') {
        initScenario(sceneId);
    } else {
        setTimeout(() => {
            initScenario(sceneId);
        }, 100);
    }
}
