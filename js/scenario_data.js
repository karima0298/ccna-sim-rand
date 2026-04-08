const scenarios = [
  // フリーモード（判定なし、自由に操作）
  {
    id: "free",
    title: "フリー練習モード",
    description: "自由にコマンドを操作できます。判定はありません。",
    devices: [
      { name: "Switch", type: "switch" },
      { name: "Router", type: "router" }
    ],
    tasks: []
  },

// -------------------------------------------------------------
  // 【新】問題①: VLANとLLDPの設定
  // -------------------------------------------------------------
  {
    id: "new_q1",
    title: "【新】問題①",
    image: "img/new_q1.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>R1には必要なコマンドがすべて事前に設定されています。すべての物理ケーブルが接続され、検証済みです。PC1とPC2はスイッチに接続を確立する必要があり、各ポートは1つのVLANのみを許可する必要があります。</p>
      </div>
    `,
    tasks: [
      "SW-1をVLAN 35に設定し、SALESというラベルを付けます",
      "SW-2をVLAN 39に設定し、MARKETINGというラベルを付けます",
      "PC1に接続するスイッチポートを設定します",
      "PC2に接続するスイッチポートを設定します",
      "業界標準プロトコルを使用して、SW-1とSW-2をユニバーサルネイバーディスカバリに設定し、PC1に接続するインターフェースで無効にします。"
    ],
    // ▼ 練習モード用の解答を追加 ▼
    answers: [
`SW-1(config)#vlan 35
SW-1(config-vlan)#name SALES
SW-1(config-vlan)#exit`,

`SW-2(config)#vlan 39
SW-2(config-vlan)#name MARKETING
SW-2(config-vlan)#exit`,

`SW-1(config)#int e0/2
SW-1(config-if)#switchport mode access
SW-1(config-if)#switchport access vlan 35`,

`SW-2(config)#int e0/2
SW-2(config-if)#switchport mode access
SW-2(config-if)#switchport access vlan 39`,

`! SW-1とSW-2の両方でLLDPをグローバルに有効化する
SW-1、SW-2(config)#lldp run

! PC1に接続するインターフェースでLLDPを無効にする
SW-1(config)#int e0/2
SW-1(config-if)#no lldp receive
SW-1(config-if)#no lldp transmit`
    ],
    devices: [
      { name: "SW-1", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] },
      { name: "SW-2", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] }
    ],
    validations: [
      { device: "SW-1", path: "runningConfig.vlans.35.name", expected: "SALES", message: "SW-1: VLAN 35 の名前が SALES ではありません" },
      { device: "SW-2", path: "runningConfig.vlans.39.name", expected: "MARKETING", message: "SW-2: VLAN 39 の名前が MARKETING ではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/2.switchport.mode", expected: "access", message: "SW-1: Ethernet0/2 のモードが access ではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/2.switchport.access_vlan", expected: "35", message: "SW-1: Ethernet0/2 が VLAN 35 に割り当てられていません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.mode", expected: "access", message: "SW-2: Ethernet0/2 のモードが access ではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.access_vlan", expected: "39", message: "SW-2: Ethernet0/2 が VLAN 39 に割り当てられていません" },
      { device: "SW-1", path: "runningConfig.lldp.enabled", expected: true, message: "SW-1: LLDPがグローバルで有効になっていません" },
      { device: "SW-2", path: "runningConfig.lldp.enabled", expected: true, message: "SW-2: LLDPがグローバルで有効になっていません" },
      { device: "SW-1", path: "runningConfig.lldp.interfaces.Ethernet0/2.receive", expected: false, message: "SW-1: Ethernet0/2 で lldp receive が無効になっていません" },
      { device: "SW-1", path: "runningConfig.lldp.interfaces.Ethernet0/2.transmit", expected: false, message: "SW-1: Ethernet0/2 で lldp transmit が無効になっていません" },
      { device: "SW-1", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "SW-1: 設定が保存されていません (copy run start を実行してください)" },
      { device: "SW-2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "SW-2: 設定が保存されていません (copy run start を実行してください)" }
    ]
  },

  // -------------------------------------------------------------
  // 【新】問題②: VLANとCDPの設定
  // -------------------------------------------------------------
  {
    id: "new_q2",
    title: "【新】問題②",
    image: "img/new_q2.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>R1には必要なコマンドがすべて事前に設定されています。すべての物理ケーブルが接続され、検証済みです。PC1、PC3、およびサーバーからスイッチへの接続を確立し、各ポートで1つのVLANのみを許可する必要があります。</p>
      </div>
    `,
    tasks: [
      "PC3のスイッチポートに接続するVLANを「SALES」という名前で設定します",
      "Server1に接続するスイッチポートを設定します",
      "PC3に接続するスイッチポートを設定します",
      "R1がCisco独自の近隣探索プロトコルを使用してSW-1を検出し、ネットワーク上の他のすべてのデバイスがSW-1を検出できないことを確認します。"
    ],
    // ▼ 練習モード用の解答を追加 ▼
    answers: [
`SW-2(config)#vlan 30
SW-2(config-vlan)#name SALES
SW-2(config-vlan)#exit`,

`SW-2(config)#int e0/2
SW-2(config-if)#switchport mode access
SW-2(config-if)#switchport access vlan 20`,

`SW-2(config-if)#int e0/3
SW-2(config-if)#switchport mode access
SW-2(config-if)#switchport access vlan 30`,

`SW-1(config)#cdp run
SW-1(config)#int e0/0
SW-1(config-if)#cdp enable
SW-1(config-if)#exit
SW-1(config)#int range e0/1 - 2
SW-1(config-if-range)#no cdp enable`
    ],
    devices: [
      { name: "SW-1", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] },
      { name: "SW-2", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2", "Ethernet0/3"] }
    ],
    validations: [
      { device: "SW-2", path: "runningConfig.vlans.30.name", expected: "SALES", message: "SW-2: VLAN 30 の名前が SALES ではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.mode", expected: "access", message: "SW-2: Ethernet0/2 (Server1) が access モードではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.access_vlan", expected: "20", message: "SW-2: Ethernet0/2 が VLAN 20 に設定されていません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/3.switchport.mode", expected: "access", message: "SW-2: Ethernet0/3 (PC3) が access モードではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/3.switchport.access_vlan", expected: "30", message: "SW-2: Ethernet0/3 が VLAN 30 に設定されていません" },
      { device: "SW-1", path: "runningConfig.cdp.enabled", expected: true, message: "SW-1: CDPがグローバルで有効になっていません" },
      { device: "SW-1", path: "runningConfig.cdp.interfaces.Ethernet0/0", condition: (val) => val !== false, message: "SW-1: Ethernet0/0 で CDP が有効になっていません" },
      { device: "SW-1", path: "runningConfig.cdp.interfaces.Ethernet0/1", expected: false, message: "SW-1: Ethernet0/1 で CDP が無効になっていません" },
      { device: "SW-1", path: "runningConfig.cdp.interfaces.Ethernet0/2", expected: false, message: "SW-1: Ethernet0/2 で CDP が無効になっていません" },
      { device: "SW-1", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "SW-1: 設定が保存されていません (copy run start を実行してください)" },
      { device: "SW-2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "SW-2: 設定が保存されていません (copy run start を実行してください)" }
    ]
  },

  // -------------------------------------------------------------
  // 【新】問題③: OSPF ネットワークアドバタイズ
  // -------------------------------------------------------------
  {
    id: "new_q3",
    title: "【新】問題③",
    image: "img/new_q3.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>※設定できるのはR2のみです。</p>
      </div>
    `,
    tasks: [
      "R2でOSPFを設定し、R1 と R2 がネイバーになることを確認します。<br>・プロセス ID として 10 を使用<br>・ルーター ID として L0のIP を使用<br>・R1がR2およびR3とのネイバー隣接関係を確立するように設定してください。使用されているプレフィックスと完全に一致するように接続されたネットワークをアドバタイズします。",
      "R2が常にエリア0のDRになるように設定してください。"
    ],
    // ▼ 練習モード用の解答と解説を追加 ▼
    answers: [
`R2(config)#router ospf 10
R2(config-router)#router-id 10.2.2.2
R2(config-router)#network 10.2.2.2 0.0.0.0 area 0
R2(config-router)#network 10.0.12.0 0.0.0.3 area 0
R2(config-router)#network 10.0.23.0 0.0.0.15 area 0`,

`R2(config)#interface range e0/0 - 1
R2(config-if-range)#ip ospf priority 255
R2(config-if-range)#end
R2#clear ip ospf process

【解説】
ip ospf priority 255を設定する理由は、対象のルータ（今回の場合はR2）をOSPFのDR（代表ルータ）に確実に選出させるためです。
OSPFのDR/BDR選出プロセスでは、インターフェースのプライオリティ値（0〜255、デフォルトは1）が最も高いルータが優先的にDRとして選ばれます。そのため、設定できる最高値である「255」を明示的に割り当てることで、他のルータのルータIDの大小に関係なく、R2が常にDRになるようにしています。

clear ip ospf processコマンドを実行する理由は代表ルータの選出を再度行うためです。
clear ip ospf processコマンドは実行した際にyes/noを入力する必要があります。

R2# clear ip ospf process
Reset ALL OSPF processes? [no]: yes　←このyesを入力してEnter
OSPF processes reset`
    ],
    devices: [
      { name: "R2", type: "router", physicalPorts: ["Ethernet0/0", "Ethernet0/1"] }
    ],
    validations: [
      { device: "R2", path: "runningConfig", condition: (config) => config?.routing?.ospf?.['10']?.routerId === '10.2.2.2', message: "R2: OSPF 10 のルーターIDが 10.2.2.2 に設定されていません" },
      { device: "R2", path: "runningConfig", condition: (config) => { const nets = config?.routing?.ospf?.['10']?.networks; return nets && nets.some(n => n.ip === '10.2.2.2' && n.wildcard === '0.0.0.0' && n.area === '0'); }, message: "R2: network 10.2.2.2 0.0.0.0 area 0 が設定されていません" },
      { device: "R2", path: "runningConfig", condition: (config) => { const nets = config?.routing?.ospf?.['10']?.networks; return nets && nets.some(n => n.ip === '10.0.12.0' && n.wildcard === '0.0.0.3' && n.area === '0'); }, message: "R2: network 10.0.12.0 0.0.0.3 area 0 が設定されていません" },
      { device: "R2", path: "runningConfig", condition: (config) => { const nets = config?.routing?.ospf?.['10']?.networks; return nets && nets.some(n => n.ip === '10.0.23.0' && n.wildcard === '0.0.0.15' && n.area === '0'); }, message: "R2: network 10.0.23.0 0.0.0.15 area 0 が設定されていません" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.ospf.priority", expected: 255, message: "R2: Ethernet0/0 の OSPF priority が 255 に設定されていません" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/1.ospf.priority", expected: 255, message: "R2: Ethernet0/1 の OSPF priority が 255 に設定されていません" },
      { device: "R2", path: "runningConfig.logs", condition: (logs) => logs && logs.some(l => l.command === 'clear' && l.target === 'ip ospf process'), message: "R2: OSPFプロセスのクリアが実行されていません" },
      { device: "R2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "R2: 設定が保存されていません (copy run start を実行してください)" }
    ]
  },

  // -------------------------------------------------------------
  // 【新】問題④: IPv4 & IPv6 アドレス設定
  // -------------------------------------------------------------
  {
    id: "new_q4",
    title: "【新】問題④",
    image: "img/new_q4.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>指定されたサブネットを使用して、R1およびR2のインターフェースに適切なIPアドレスを設定してください。</p>
      </div>
    `,
    tasks: [
      "R1に、ipv4 ネットワークで使用可能な最初のホスト IP アドレスを設定します。<br>R2に、IPv4 ネットワークで使用可能な最後のホスト IP アドレスを設定します。",
      "R1 にIPv6 ネットワークで使用可能な最初のホスト IP アドレスを設定します。<br>R2 にIPv6 ネットワークで使用可能な最後のホスト IP アドレスを設定します。"
    ],
    // ▼ 練習モード用の解答と解説を追加 ▼
    answers: [
`R1(config)#interface e0/0
R1(config-if)#ip address 10.0.12.5 255.255.255.252
R1(config-if)#no shut

R2(config)#interface e0/0
R2(config-if)#ip address 10.0.12.6 255.255.255.252
R2(config-if)#no shut`,

`R1(config)#interface e0/0
R1(config-if)#ipv6 address 2001:db8:12::1/126

R2(config)#interface e0/0
R2(config-if)#ipv6 address 2001:db8:12::3/126

【解説】IPv6アドレス（/126）の計算方法
プレフィックス長 /126 のIPv6ネットワークから、割り当て可能な「最初」と「最後」のホストIPアドレスを算出する手順は下記となります。

1. ホスト部のビット数を確認する
IPv6アドレスの全体は128ビットです。今回指定されているネットワークのプレフィックス長は /126 のため、128から126を引いた残りのビット数がホスト部となります。
128ビット - 126ビット = 2ビット

2.サブネット内のアドレス範囲を割り出す
ホスト部が2ビットの場合、作ることができるアドレスのパターンは 2の2乗 で合計 4個 となります。
指定されたサブネット 2001:db8:12::/126 における末尾の4パターンは以下の通りです。
2001:db8:12::0 （Anycast用アドレス等として予約済のため使用不可）
2001:db8:12::1 （最初に使用可能なホストIP）
2001:db8:12::2
2001:db8:12::3 （最後に使用可能なホストIP　※IPv6にはブロードキャストアドレスがありません）

3.各機器にアドレスを割り当てる
タスクの要件に合わせて、算出したアドレスをR1とR2にそれぞれ設定します。
R1（最初のホストIP）： 2001:db8:12::1/126
R2（最後のホストIP）： 2001:db8:12::3/126`
    ],
    devices: [
      { name: "R1", type: "router", physicalPorts: ["Ethernet0/0"] },
      { name: "R2", type: "router", physicalPorts: ["Ethernet0/0"] }
    ],
    validations: [
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ip", expected: "10.0.12.5", message: "R1: IPv4アドレスが 10.0.12.5 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.mask", expected: "255.255.255.252", message: "R1: IPv4サブネットマスクが 255.255.255.252 ではありません" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.ip", expected: "10.0.12.6", message: "R2: IPv4アドレスが 10.0.12.6 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ipv6", expected: "2001:db8:12::1/126", message: "R1: IPv6アドレスが 2001:db8:12::1/126 に設定されていません" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.ipv6", expected: "2001:db8:12::3/126", message: "R2: IPv6アドレスが 2001:db8:12::3/126 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.status", expected: "up", message: "R1: インターフェースが起動していません (no shut)" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.status", expected: "up", message: "R2: インターフェースが起動していません (no shut)" },
      { device: "R1", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "R1: 設定が保存されていません (copy run start を実行してください)" },
      { device: "R2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "R2: 設定が保存されていません (copy run start を実行してください)" }
    ]
  },

  // -------------------------------------------------------------
  // 【新】問題⑤: トランクとEtherChannel (LACP)
  // -------------------------------------------------------------
  {
    id: "new_q5",
    title: "【新】問題⑤",
    image: "img/new_q5.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>設定できるのはSW1とSW2のみです。</p>
      </div>
    `,
    tasks: [
      "IEEE 標準フレームタグ付け方式を使用して、ポートEO/0とE0/1 上でSW1 と SW2間のトランクを設定します。<br>またVLAN1,11,12のみが通信出来るように設定します",
      "vlan12のみを許可するようにSW1の0/2を設定します",
      "Sw1とSw2でLACPを設定します。<br>E0/0とEO/1を単一の論理リンクに統合し、トランク構成はそのまま維持します。<br>リンクに番号12を割り当てます。<br>両方のリンクでネゴシエーションを行う必要があります。"
    ],
    // ▼ 練習モード用の解答を追加 ▼
    answers: [
`Sw1,Sw2(config)#interface range e0/0 - 1
Sw1,Sw2(config-if-range)#switchport trunk encapsulation dot1q
Sw1,Sw2(config-if-range)#switchport mode trunk
Sw1,Sw2(config-if-range)#switchport trunk allowed vlan 1,11,12`,

`Sw1(config)#interface e0/2
Sw1(config-if-range)#switchport trunk encapsulation dot1q
Sw1(config-if-range)#switchport mode trunk
Sw1(config-if-range)#switchport trunk allowed 12`,

`Sw1,Sw2(config-if-range)#channel-group 12 mode active`
    ],
    devices: [
      { name: "Sw1", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] },
      { name: "Sw2", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1"] }
    ],
    validations: [
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/0.switchport.encapsulation", expected: "dot1q", message: "Sw1: E0/0 のトランクカプセル化が dot1q ではありません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/0.switchport.mode", expected: "trunk", message: "Sw1: E0/0 が trunk モードではありません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/0.switchport.allowed_vlans", match: "containsAll", expected: ["1", "11", "12"], message: "Sw1: E0/0 で VLAN 1, 11, 12 が許可されていません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.id", expected: "12", message: "Sw1: E0/0 が channel-group 12 に設定されていません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.mode", expected: "active", message: "Sw1: E0/0 の LACPモード が active ではありません" },
      
      { device: "Sw2", path: "runningConfig.interfaces.Ethernet0/0.switchport.encapsulation", expected: "dot1q", message: "Sw2: E0/0 のトランクカプセル化が dot1q ではありません" },
      { device: "Sw2", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.mode", expected: "active", message: "Sw2: E0/0 の LACPモード が active ではありません" },
      
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/2.switchport.encapsulation", expected: "dot1q", message: "Sw1: E0/2 のトランクカプセル化が dot1q ではありません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/2.switchport.mode", expected: "trunk", message: "Sw1: E0/2 が trunk モードではありません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/2.switchport.allowed_vlans", match: "contains", expected: "12", message: "Sw1: E0/2 で VLAN 12 が許可されていません" },
      
      { device: "Sw1", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "Sw1: 設定が保存されていません (copy run start を実行してください)" },
      { device: "Sw2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "Sw2: 設定が保存されていません (copy run start を実行してください)" }
    ]
  },

// -------------------------------------------------------------
  // 【新】問題⑥: Voice VLAN と LLDP
  // -------------------------------------------------------------
  {
    id: "new_q6",
    title: "【新】問題⑥",
    image: "img/new_q6.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>物理的なケーブル配線はすべて完了し、検証済みです。スイッチのE0/1、E0/2、E0/3ポートの接続は、音声およびデータ通信機能に対応できるよう設定され、利用可能である必要があります。</p>
      </div>
    `,
    tasks: [
      "Sw1とSw2の両方にVLANを設定し、トポロジーで指定されたVLAN名に従って名前を付けます。",
      "両方のスイッチのE0/1、E0/2、およびE0/3ポートを両方のVLAN用に設定し、Cisco IP電話とPCがトラフィックを通過できるようにします。",
      "e0/0 上でベンダーニュートラルプロトコルを介してネイバー検出を許可するように Sw1とSw2 を設定します。"
    ],
    // ▼ 練習モード用の解答を追加 ▼
    answers: [
`Sw1,Sw2(config)# vlan 77
Sw1,Sw2(config-vlan)# name User_VLAN
Sw1,Sw2(config-vlan)# exit
Sw1,Sw2(config)# vlan 177
Sw1,Sw2(config-vlan)# name Voice_VLAN
Sw1,Sw2(config-vlan)# exit`,

`Sw1,Sw2(config)# int range e0/1 - 3
Sw1,Sw2(config-if)# switchport mode access
Sw1,Sw2(config-if)# switchport access vlan 77
Sw1,Sw2(config-if)# switchport voice vlan 177`,

`Sw1,Sw2(config)# lldp run
Sw1,Sw2(config)# int e0/0
Sw1,Sw2(config-if)# lldp transmit
Sw1,Sw2(config-if)# lldp receive`
    ],
    devices: [
      { name: "Sw1", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2", "Ethernet0/3"] },
      { name: "Sw2", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2", "Ethernet0/3"] }
    ],
    validations: [
      { device: "Sw1", path: "runningConfig.vlans.77.name", expected: "User_VLAN", message: "Sw1: VLAN 77 の名前が 'User_VLAN' ではありません" },
      { device: "Sw1", path: "runningConfig.vlans.177.name", expected: "Voice_VLAN", message: "Sw1: VLAN 177 の名前が 'Voice_VLAN' ではありません" },
      { device: "Sw2", path: "runningConfig.vlans.77.name", expected: "User_VLAN", message: "Sw2: VLAN 77 の名前が 'User_VLAN' ではありません" },
      { device: "Sw2", path: "runningConfig.vlans.177.name", expected: "Voice_VLAN", message: "Sw2: VLAN 177 の名前が 'Voice_VLAN' ではありません" },
      
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/1.switchport.mode", expected: "access", message: "Sw1: E0/1 が access モードではありません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/1.switchport.access_vlan", expected: "77", message: "Sw1: E0/1 に Data VLAN 77 が設定されていません" },
      { device: "Sw1", path: "runningConfig.interfaces.Ethernet0/1.switchport.voice_vlan", expected: "177", message: "Sw1: E0/1 に Voice VLAN 177 が設定されていません" },
      
      { device: "Sw2", path: "runningConfig.interfaces.Ethernet0/3.switchport.voice_vlan", expected: "177", message: "Sw2: E0/3 に Voice VLAN 177 が設定されていません" },

      { device: "Sw1", path: "runningConfig.lldp.enabled", expected: true, message: "Sw1: LLDPがグローバルで有効になっていません (lldp run)" },
      { device: "Sw1", path: "runningConfig.lldp.interfaces.Ethernet0/0.transmit", expected: true, message: "Sw1: E0/0 で lldp transmit が設定されていません" },
      { device: "Sw1", path: "runningConfig.lldp.interfaces.Ethernet0/0.receive", expected: true, message: "Sw1: E0/0 で lldp receive が設定されていません" },
      
      { device: "Sw2", path: "runningConfig.lldp.enabled", expected: true, message: "Sw2: LLDPがグローバルで有効になっていません (lldp run)" },
      { device: "Sw2", path: "runningConfig.lldp.interfaces.Ethernet0/0.transmit", expected: true, message: "Sw2: E0/0 で lldp transmit が設定されていません" },
      
      // ★ 設定保存チェック
      { device: "Sw1", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "Sw1: 設定が保存されていません (copy run start または write を実行してください)" },
      { device: "Sw2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "Sw2: 設定が保存されていません (copy run start または write を実行してください)" }
    ]
  },

  // -------------------------------------------------------------
  // 【新】問題⑦: エンドデバイスへの接続とネイバーディスカバリ
  // -------------------------------------------------------------
  {
    id: "new_q7",
    title: "【新】問題⑦",
    image: "img/new_q7.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>R1には必要なコマンドがすべて事前に設定されています。すべての物理ケーブルは設置され、検証済みです。エンドデバイスへの接続を設定する必要があります。</p>
      </div>
    `,
    tasks: [
      "1. SW-1のスイッチポートE0/1をCisco IP電話とPCのトラフィックを伝送するように設定します。",
      "2. SW-2のE0/1をPC2のトラフィックを伝送するように設定します。",
      "3. SW-1でVLAN 10を「Engineering」という名前で設定します。",
      "4. SW-1とSW-2間のリンクを、ベンダーニュートラルなネイバーディスカバリプロトコルを使用するように設定します。",
      "5. SW-1からR1へのリンクを、Ciscoネイバーディスカバリプロトコルが通過しないように設定します。"
    ],
    // ▼ 練習モード用の解答を追加 ▼
    answers: [
`SW-1(config)#int e0/1
SW-1(config-if)#switchport mode access
SW-1(config-if)#switchport access vlan 10
SW-1(config-if)#switchport voice vlan 11`,

`SW-2(config)#int e0/1
SW-2(config-if)#switchport mode access
SW-2(config-if)#switchport access vlan 30`,

`SW-1(config)#vlan 10
SW-1(config-vlan)#name Engineering
SW-1(config-vlan)#exit`,

`SW-1、SW-2(config)#lldp run
SW-1、SW-2(config)#int e0/0
SW-1、SW-2(config-if)#lldp transmit
SW-1、SW-2(config-if)#lldp receive`,

`SW-1(config)#int e0/2
SW-1(config-if)#no cdp enable`
    ],
    devices: [
      { name: "SW-1", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] },
      { name: "SW-2", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1"] }
    ],
    validations: [
      // SW-1
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.switchport.mode", expected: "access", message: "SW-1: E0/1 が access モードではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.switchport.access_vlan", expected: "10", message: "SW-1: E0/1 の access vlan が 10 に設定されていません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.switchport.voice_vlan", expected: "11", message: "SW-1: E0/1 の voice vlan が 11 に設定されていません" },
      { device: "SW-1", path: "runningConfig.vlans.10.name", expected: "Engineering", message: "SW-1: VLAN 10 の名前が Engineering ではありません" },
      { device: "SW-1", path: "runningConfig.lldp.enabled", expected: true, message: "SW-1: LLDPがグローバルで有効になっていません" },
      { device: "SW-1", path: "runningConfig.lldp.interfaces.Ethernet0/0.transmit", expected: true, message: "SW-1: E0/0 で lldp transmit が設定されていません" },
      { device: "SW-1", path: "runningConfig.lldp.interfaces.Ethernet0/0.receive", expected: true, message: "SW-1: E0/0 で lldp receive が設定されていません" },
      { device: "SW-1", path: "runningConfig.cdp.interfaces.Ethernet0/2", expected: false, message: "SW-1: E0/2 で CDP が無効化されていません" },
      // SW-2
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/1.switchport.mode", expected: "access", message: "SW-2: E0/1 が access モードではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/1.switchport.access_vlan", expected: "30", message: "SW-2: E0/1 の access vlan が 30 に設定されていません" },
      { device: "SW-2", path: "runningConfig.lldp.enabled", expected: true, message: "SW-2: LLDPがグローバルで有効になっていません" },
      { device: "SW-2", path: "runningConfig.lldp.interfaces.Ethernet0/0.transmit", expected: true, message: "SW-2: E0/0 で lldp transmit が設定されていません" },
      { device: "SW-2", path: "runningConfig.lldp.interfaces.Ethernet0/0.receive", expected: true, message: "SW-2: E0/0 で lldp receive が設定されていません" }
    ]
  },

  // -------------------------------------------------------------
  // 【新】問題⑧: VLAN、トランク、およびリンクアグリゲーション
  // -------------------------------------------------------------
  {
    id: "new_q8",
    title: "【新】問題⑧",
    image: "img/new_q8.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>3台のスイッチすべてにVLAN35と45が設定されています。すべての物理接続がインストールおよび検証済みです。すべてのスイッチ間リンクが動作している必要があります。</p>
      </div>
    `,
    tasks: [
      "1. SW-1とSW2のスイッチポートe0/0とe0/1を802.1qトランキング用に設定し、すべてのVLANを許可する",
      "2. SW-1 e0/2、SW-2 e0/2、SW-3 e0/0およびe0/1のスイッチ間リンクをネイティブVLAN35を使用するように設定します。",
      "3. SW-1とSW-2のスイッチポートe0/0とe0/1をリンクアグリゲーション用に設定する。SW1はLACPを直ちにネゴシエートし、SW-2はLACP要求にのみ応答する必要がある。"
    ],
    // ▼ 練習モード用の解答と解説を追加 ▼
    answers: [
`SW-1、SW-2(config)# int range e0/0 - 1
SW-1、SW-2(config-if)# switchport trunk encapsulation dot1q
SW-1、SW-2(config-if)# switchport mode trunk`,

`SW-1、SW-2 (config)# no logging console
SW-1、SW-2 (config)# int e0/2
SW-1、SW-2(config-if)# switchport trunk encapsulation dot1q
SW-1、SW-2(config-if)# switchport mode trunk
SW-1、SW-2(config-if)# switchport trunk native vlan 35

SW-3 (config)# no logging console
SW-3 (config)# int range e0/0 - 1
SW-3 (config-if)# switchport trunk encapsulation dot1q
SW-3 (config-if)# switchport mode trunk
SW-3 (config-if)# switchport trunk native vlan 35

【解説】
no logging consoleコマンドはログの出力を停止するコマンドです。
ネイティブVLANの設定変更を行うと、対向スイッチとのネイティブVLAN不一致でログ大量に出力されコマンドの実行がしにくくなるので無効化することでコマンドをスムーズに実行できるようになります。`,

`SW-1(config)# int range e0/0 - 1
SW-1(config-if)# channel-group 12 mode active

SW-2(config)# int range e0/0 - 1
SW-2(config-if)# channel-group 12 mode passive`
    ],
    devices: [
      { name: "SW-1", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] },
      { name: "SW-2", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1", "Ethernet0/2"] },
      { name: "SW-3", type: "switch", physicalPorts: ["Ethernet0/0", "Ethernet0/1"] }
    ],
    validations: [
      // SW-1
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/0.switchport.encapsulation", expected: "dot1q", message: "SW-1: E0/0 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/0.switchport.mode", expected: "trunk", message: "SW-1: E0/0 が trunk モードではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.switchport.encapsulation", expected: "dot1q", message: "SW-1: E0/1 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.switchport.mode", expected: "trunk", message: "SW-1: E0/1 が trunk モードではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/2.switchport.encapsulation", expected: "dot1q", message: "SW-1: E0/2 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/2.switchport.mode", expected: "trunk", message: "SW-1: E0/2 が trunk モードではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/2.switchport.native_vlan", expected: "35", message: "SW-1: E0/2 の native vlan が 35 に設定されていません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.id", expected: "12", message: "SW-1: E0/0 に channel-group 12 が設定されていません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.mode", expected: "active", message: "SW-1: E0/0 の channel-group mode が active ではありません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.channelGroup.id", expected: "12", message: "SW-1: E0/1 に channel-group 12 が設定されていません" },
      { device: "SW-1", path: "runningConfig.interfaces.Ethernet0/1.channelGroup.mode", expected: "active", message: "SW-1: E0/1 の channel-group mode が active ではありません" },
      // SW-2
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/0.switchport.encapsulation", expected: "dot1q", message: "SW-2: E0/0 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/0.switchport.mode", expected: "trunk", message: "SW-2: E0/0 が trunk モードではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/1.switchport.encapsulation", expected: "dot1q", message: "SW-2: E0/1 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/1.switchport.mode", expected: "trunk", message: "SW-2: E0/1 が trunk モードではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.encapsulation", expected: "dot1q", message: "SW-2: E0/2 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.mode", expected: "trunk", message: "SW-2: E0/2 が trunk モードではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/2.switchport.native_vlan", expected: "35", message: "SW-2: E0/2 の native vlan が 35 に設定されていません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.id", expected: "12", message: "SW-2: E0/0 に channel-group 12 が設定されていません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/0.channelGroup.mode", expected: "passive", message: "SW-2: E0/0 の channel-group mode が passive ではありません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/1.channelGroup.id", expected: "12", message: "SW-2: E0/1 に channel-group 12 が設定されていません" },
      { device: "SW-2", path: "runningConfig.interfaces.Ethernet0/1.channelGroup.mode", expected: "passive", message: "SW-2: E0/1 の channel-group mode が passive ではありません" },
      // SW-3
      { device: "SW-3", path: "runningConfig.interfaces.Ethernet0/0.switchport.encapsulation", expected: "dot1q", message: "SW-3: E0/0 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-3", path: "runningConfig.interfaces.Ethernet0/0.switchport.mode", expected: "trunk", message: "SW-3: E0/0 が trunk モードではありません" },
      { device: "SW-3", path: "runningConfig.interfaces.Ethernet0/0.switchport.native_vlan", expected: "35", message: "SW-3: E0/0 の native vlan が 35 に設定されていません" },
      { device: "SW-3", path: "runningConfig.interfaces.Ethernet0/1.switchport.encapsulation", expected: "dot1q", message: "SW-3: E0/1 の trunk encapsulation が dot1q ではありません" },
      { device: "SW-3", path: "runningConfig.interfaces.Ethernet0/1.switchport.mode", expected: "trunk", message: "SW-3: E0/1 が trunk モードではありません" },
      { device: "SW-3", path: "runningConfig.interfaces.Ethernet0/1.switchport.native_vlan", expected: "35", message: "SW-3: E0/1 の native vlan が 35 に設定されていません" }
    ]
  },

// -------------------------------------------------------------
  // 【新】問題⑨: OSPFプロセスの設定（インターフェースベース）
  // -------------------------------------------------------------
  {
    id: "new_q9",
    title: "【新】問題⑨",
    image: "img/new_q9.png",
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>※設定できる機器はR1です。</p>
      </div>
    `,
    tasks: [
      "タスク1. プロセス ID とルータ ID のみを使用して R1 上の OSPF を設定します。<br>・プロセス ID として 30 を使用<br>・ルーター ID として E0/0のIP を使用",
      "タスク2. R1がR2およびR3とネイバー関係を確立するように設定します。OSPFプロセスのネットワークステートメントは使用しないでください。<br>R1が常にエリア0のDRになるように設定してください。"
    ],
    // ▼ ここから練習モード用の解答・解説を追加 ▼
    answers: [
      "R1(config)#router ospf 30\nR1(config-router)#router-id 10.0.12.1\n\n【解説】\n※上記のe0/0のIPアドレスは構成図上に書いていないので、本来は show run コマンド等で確認して設定する必要がありますが、構成図内のIPアドレスが変わっていなければ確認せずに上記のIPを決め打ちしても大丈夫です。",
      
      "R1(config)#int range e0/0 - 1\nR1(config-if-range)#ip ospf 30 area 0\nR1(config-if-range)#ip ospf priority 255\nR1(config-if-range)#end\nR1#clear ip ospf process\n\n【解説】\nip ospf priority 255を設定する理由は、対象のルータ（今回の場合はR1）をOSPFのDR（代表ルータ）に確実に選出させるためです。\nOSPFのDR/BDR選出プロセスでは、インターフェースのプライオリティ値（0〜255、デフォルトは1）が最も高いルータが優先的にDRとして選ばれます。そのため、設定できる最高値である「255」を明示的に割り当てることで、他のルータのルータIDの大小に関係なく、R1が常にDRになるようにしています。\n\nclear ip ospf process コマンドを実行する理由は代表ルータの選出を再度行うためです。\nこのコマンドは実行した際にyes/noを入力する必要があります。\n\nR1# clear ip ospf process\nReset ALL OSPF processes? [no]: yes　←このyesを入力してEnter\nOSPF processes reset"
    ],
    // ▲ ここまで追加 ▲
    devices: [
      { name: "R1", type: "router", physicalPorts: ["Ethernet0/0", "Ethernet0/1"] }
    ],
    validations: [
      { device: "R1", path: "runningConfig.routing.ospf.30.routerId", expected: "10.0.12.1", message: "R1: OSPFプロセス30のルーターIDが 10.0.12.1 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ospf.processId", expected: "30", message: "R1: E0/0 の OSPFプロセスIDが 30 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ospf.area", expected: "0", message: "R1: E0/0 の OSPFエリアが 0 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ospf.priority", expected: 255, message: "R1: E0/0 の OSPF priority が 255 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/1.ospf.processId", expected: "30", message: "R1: E0/1 の OSPFプロセスIDが 30 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/1.ospf.area", expected: "0", message: "R1: E0/1 の OSPFエリアが 0 に設定されていません" },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/1.ospf.priority", expected: 255, message: "R1: E0/1 の OSPF priority が 255 に設定されていません" },
      { device: "R1", path: "runningConfig.logs", condition: (logs) => logs && logs.some(l => l.command === 'clear' && l.target === 'ip ospf process'), message: "R1: OSPFプロセスのクリアが実行されていません" }
    ]
  }
// -------------------------------------------------------------
  // 【新】問題⑨: OSPFプロセスの設定（インターフェースベース）
  // -------------------------------------------------------------
  {
    id: "new_q9",
    title: "【新】問題⑨",
    // ...中略...
    validations: [
      // ...中略...
    ]
  }, // ★ここにカンマを追加

  // -------------------------------------------------------------
  // 【試験】問題④: IPv4 & IPv6 アドレス設定 (ランダム化)
  // -------------------------------------------------------------
  {
    id: "new_q4_exam",
    title: "【試験】IPv4 & IPv6 アドレス設定",
    image: "img/new_q4.png", 
    description: `<p>指定されたサブネットを使用して、R1およびR2のインターフェースに適切なIPアドレスを設定してください。</p>`,
    generateVars: () => {
      const fourth = Math.floor(Math.random() * 63) * 4 + 4; 
      const hex = Math.floor(Math.random() * 16).toString(16);
      return {
        ipv4Subnet: `10.0.12.${fourth}/30`,
        r1Ipv4: `10.0.12.${fourth + 1}`,
        r2Ipv4: `10.0.12.${fourth + 2}`,
        ipv6Subnet: `2001:db8:12:${hex}::/126`,
        r1Ipv6: `2001:db8:12:${hex}::1/126`,
        r2Ipv6: `2001:db8:12:${hex}::3/126`
      };
    },
    getTasks: (v) => [
      `R1に、IPv4 <strong>${v.ipv4Subnet}</strong> の最初のIPを設定してください。<br>R2に、同ネットワークの最後のアドレスを設定してください。`,
      `R1に、IPv6 <strong>${v.ipv6Subnet}</strong> の最初のIPを設定してください。<br>R2に、同ネットワークの最後のアドレスを設定してください。`
    ],
    getValidations: (v) => [
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ip", expected: v.r1Ipv4, message: `R1 IPv4不一致` },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.ip", expected: v.r2Ipv4, message: `R2 IPv4不一致` }
    ],
    getAnswers: (v) => [
      `R1(config-if)#ip address ${v.r1Ipv4} 255.255.255.252\nR2(config-if)#ip address ${v.r2Ipv4} 255.255.255.252`,
      `R1(config-if)#ipv6 address ${v.r1Ipv6}\nR2(config-if)#ipv6 address ${v.r2Ipv6}`
    ],
    devices: [{ name: "R1", type: "router", physicalPorts: ["Ethernet0/0"] }, { name: "R2", type: "router", physicalPorts: ["Ethernet0/0"] }]
  }
// ...（これより上にある既存の問題ブロックはそのまま残してください）...

  // =========================================================================================
  // 【試験モード用】ランダム化シナリオ
  // =========================================================================================

  // -------------------------------------------------------------
  // 【新】問題④: IPv4 & IPv6 アドレス設定 (試験モード専用)
  // -------------------------------------------------------------
  {
    id: "new_q4_exam",
    title: "【試験】IPv4/IPv6アドレス設定",
    image: "img/new_q4_base.png", // 文字を消した背景画像を指定
    description: `
      <div class="task-section">
        <p><strong>ガイドライン</strong></p>
        <p>指定されたサブネットを使用して、R1およびR2のインターフェースに適切なIPアドレスを設定してください。</p>
      </div>
    `,
    // 開いた瞬間にランダムなIPアドレス変数を生成するロジック
    generateVars: () => {
      const fourthOctet = Math.floor(Math.random() * 60) * 4 + 4; 
      const hexDigit = Math.floor(Math.random() * 16).toString(16);
      return {
        ipv4Subnet: `10.0.12.${fourthOctet}/30`,
        r1Ipv4: `10.0.12.${fourthOctet + 1}`,
        r2Ipv4: `10.0.12.${fourthOctet + 2}`,
        ipv6Subnet: `2001:db8:12:${hexDigit}::/126`,
        r1Ipv6: `2001:db8:12:${hexDigit}::1/126`,
        r2Ipv6: `2001:db8:12:${hexDigit}::3/126`
      };
    },
    // 生成した変数をタスク文に埋め込む
    getTasks: (vars) => [
      `R1に、IPv4ネットワーク <strong>${vars.ipv4Subnet}</strong> で使用可能な最初のホスト IP アドレスを設定します。<br>R2に、同ネットワークで使用可能な最後のホスト IP アドレスを設定します。`,
      `R1 にIPv6ネットワーク <strong>${vars.ipv6Subnet}</strong> で使用可能な最初のホスト IP アドレスを設定します。<br>R2 に同ネットワークで使用可能な最後のホスト IP アドレスを設定します。`
    ],
    // 生成した変数を正解の判定（検証）ルールに埋め込む
    getValidations: (vars) => [
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ip", expected: vars.r1Ipv4, message: `R1: IPv4アドレスが ${vars.r1Ipv4} に設定されていません` },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.mask", expected: "255.255.255.252", message: "R1: IPv4サブネットマスクが 255.255.255.252 ではありません" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.ip", expected: vars.r2Ipv4, message: `R2: IPv4アドレスが ${vars.r2Ipv4} に設定されていません` },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.ipv6", expected: vars.r1Ipv6, message: `R1: IPv6アドレスが ${vars.r1Ipv6} に設定されていません` },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.ipv6", expected: vars.r2Ipv6, message: `R2: IPv6アドレスが ${vars.r2Ipv6} に設定されていません` },
      { device: "R1", path: "runningConfig.interfaces.Ethernet0/0.status", expected: "up", message: "R1: インターフェースが起動していません (no shut)" },
      { device: "R2", path: "runningConfig.interfaces.Ethernet0/0.status", expected: "up", message: "R2: インターフェースが起動していません (no shut)" },
      { device: "R1", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "R1: 設定が保存されていません (copy run start を実行してください)" },
      { device: "R2", path: "runningConfig.startupConfig", condition: (val) => val != null, message: "R2: 設定が保存されていません (copy run start を実行してください)" }
    ],
    // 練習モード用に解答コマンドを生成
    getAnswers: (vars) => [
`R1(config)#interface e0/0
R1(config-if)#ip address ${vars.r1Ipv4} 255.255.255.252
R1(config-if)#no shut

R2(config)#interface e0/0
R2(config-if)#ip address ${vars.r2Ipv4} 255.255.255.252
R2(config-if)#no shut`,

`R1(config)#interface e0/0
R1(config-if)#ipv6 address ${vars.r1Ipv6}

R2(config)#interface e0/0
R2(config-if)#ipv6 address ${vars.r2Ipv6}

【解説】IPv6アドレス（/126）の計算方法
指定されたIPv6ネットワーク（${vars.ipv6Subnet}）から、割り当て可能な最初と最後のホストIPアドレスを算出します。
ホスト部が2ビットのため、最初のアドレスが「1」、最後が「3」となります。`
    ],
    devices: [
      { name: "R1", type: "router", physicalPorts: ["Ethernet0/0"] },
      { name: "R2", type: "router", physicalPorts: ["Ethernet0/0"] }
    ]
  }
]; // ファイルの最後閉じカッコはここ★
