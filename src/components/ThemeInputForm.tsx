import React, { useState } from 'react';
import { BookOpen, Video, Plus, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { ExamConfig, VideoScene } from '../types';

interface ThemeInputFormProps {
  onStartConfig: (config: ExamConfig) => void;
}

// 30 Predefined official MOE PSLE Oral themes and predictions based on 9-year data & trends
const PRESETS: ExamConfig[] = [
  {
    theme: '保持环境清洁 (Keeping the Environment Clean)',
    narration: '保持环境清洁，人人有责 (Keeping the environment clean is everyone\'s responsibility)',
    scenes: [
      { sceneNumber: 1, description: '一位男士一边开信箱，一边把传单丢在地上，过后清洁工人看到地上的垃圾，失望地摇摇头。' },
      { sceneNumber: 2, description: '一群年轻人喝完饮料，把空罐留在公园里的长椅就离开，一位学生经过看到后，帮忙把空罐丢进垃圾桶。' },
      { sceneNumber: 3, description: '一群学生在海边捡拾被海浪冲上岸的塑料瓶，并齐心协力解救了一只被塑料袋困住的海星。' }
    ]
  },
  {
    theme: '邻里关怀与乐于助人 (Neighbourhood Care & Helping Others)',
    narration: '伸出援手，温暖人心 (Lending a helping hand warms hearts)',
    scenes: [
      { sceneNumber: 1, description: '一位年迈的老奶奶双手提着沉重的两袋日常用品，步履蹒跚地在组屋区走着，满头大汗。' },
      { sceneNumber: 2, description: '一个小女孩看到老奶奶后，立刻跑上前帮她提东西，并一路扶着老奶奶回家。' },
      { sceneNumber: 3, description: '在走廊上，两个邻居互相打招呼，并分享自己亲手烘焙的糕点，气氛十分融洽。' }
    ]
  },
  {
    theme: '小贩文化 (Hawker Culture)',
    narration: '小贩中心是我们的社区大餐厅，大家应该互相体谅 (Hawker centres are our community dining rooms; we should be considerate)',
    scenes: [
      { sceneNumber: 1, description: '在拥挤的小贩中心，一位年轻人大方地让陌生人搭台，一起享用午餐。' },
      { sceneNumber: 2, description: '几个学生吃完饭后，不仅没有清理桌面，还把骨头和纸巾留在桌上，引来了八哥啄食。' },
      { sceneNumber: 3, description: '一位顾客小心翼翼地把清真（Halal）托盘放进正确的回收架，并向清洁工人道谢。' }
    ]
  },
  {
    theme: '科技与学习 (Technology & Online Learning)',
    narration: '科技是把双刃剑，我们要善用它来学习 (Technology is a double-edged sword; we must use it well for learning)',
    scenes: [
      { sceneNumber: 1, description: '一个男生在使用学校的电脑进行居家学习时，偷偷打开另一个视窗玩网络游戏。' },
      { sceneNumber: 2, description: '两个同学利用平板电脑一起讨论专题作业，遇到不懂的问题便上网查阅资料。' },
      { sceneNumber: 3, description: '为了省事，一位同学直接把题目输入人工智能工具，然后一字不漏地抄在作业本上。' }
    ]
  },
  {
    theme: '安全意识 (Safety in Public Spaces)',
    narration: '安全第一，切勿贪图一时方便 (Safety first; do not compromise for temporary convenience)',
    scenes: [
      { sceneNumber: 1, description: '一个小学生在狭窄的组屋底层飞速骑行滑板车，险些撞倒一位刚学会走路的幼儿。' },
      { sceneNumber: 2, description: '在购物中心的电动扶梯上，两个男生互相推挤打闹，其中一人差点从扶梯上摔下去。' },
      { sceneNumber: 3, description: '几位路人贪图方便，不走斑马线，而是直接跨过栏杆乱穿马路。' }
    ]
  },
  {
    theme: '关爱年长者与社区义工服务 (Caring for the Elderly & Volunteering)',
    narration: '饮水思源，关爱长辈 (Remembering our roots and caring for our seniors)',
    scenes: [
      { sceneNumber: 1, description: '学校组织学生到乐龄中心做义工，起初同学们不知道怎么和老人沟通，尴尬地站在一旁。' },
      { sceneNumber: 2, description: '一位女学生主动教老奶奶使用智能手机发信息，打破了隔阂，两人开心地聊了起来。' },
      { sceneNumber: 3, description: '在组屋底层，一位学生主动上前陪独居的年长邻居聊天，老爷爷脸上露出了慈祥的笑容。' }
    ]
  },
  {
    theme: '环保与节约资源 (Environment & Conservation)',
    narration: '保护地球，从生活小事做起 (Protecting the earth starts with small daily habits)',
    scenes: [
      { sceneNumber: 1, description: '一个男生洗手时水龙头开得很大，洗完后也没关紧就离开了，水哗啦啦地流着。' },
      { sceneNumber: 2, description: '在食堂打包食物时，一位同学为了方便拿了许多一次性塑料餐具，最后却直接扔进垃圾桶。' },
      { sceneNumber: 3, description: '一位女生在离开房间前，仔细地关掉了冷气和电灯，以节约能源。' }
    ]
  },
  {
    theme: '阅读与自主学习 (Reading & Independent Learning)',
    narration: '阅读能开阔视野，培养自主学习的能力 (Reading broadens horizons and fosters independent learning)',
    scenes: [
      { sceneNumber: 1, description: '在公共图书馆里，几个学生大声喧哗，并在书架间追逐打闹，影响了别人。' },
      { sceneNumber: 2, description: '一个女孩沉浸在课外读物中，一边看一边做笔记，遇到不懂的字就查字典。' },
      { sceneNumber: 3, description: '下课后，一位学生留在座位上，独立复习当天老师教过的科学原理。' }
    ]
  },
  {
    theme: '公共交通乘车礼仪 (Social Etiquette on Public Transport)',
    narration: '互相体谅，打造优雅社会 (Being considerate helps build a gracious society)',
    scenes: [
      { sceneNumber: 1, description: '在拥挤的地铁上，一个年轻人坐在保留座位上，全程戴着耳机低头玩手机，无视面前的孕妇。' },
      { sceneNumber: 2, description: '一位学生上巴士后，把自己沉重的书包放在旁边的空位上，导致其他乘客没有位子坐。' },
      { sceneNumber: 3, description: '一名男学生主动站起来，把座位让给一位拄着拐杖的老爷爷，老爷爷向他道谢。' }
    ]
  },
  {
    theme: '与野生动物共存 (Co-existing with Wildlife)',
    narration: '尊重生命，与大自然和谐共处 (Respecting life and living in harmony with nature)',
    scenes: [
      { sceneNumber: 1, description: '在碧山公园，一群水獭在过马路，有公众为了拍照靠得太近，导致水獭受到惊吓。' },
      { sceneNumber: 2, description: '在自然保护区，几个孩子边走边吃零食，引来猕猴抢夺，孩子们吓得大叫。' },
      { sceneNumber: 3, description: '看到草丛里有野生动物，一位女生拉住想丢石头的弟弟，提醒他要保持安全距离，互不干扰。' }
    ]
  },
  {
    theme: '理财观念与电子支付 (Financial Literacy & E-payments)',
    narration: '节俭是一种美德，我们不应该盲目消费 (Managing finances wisely and avoiding blind consumption)',
    scenes: [
      { sceneNumber: 1, description: '在食堂买饭时，由于使用智能手表“嘀”一下付款太方便，一个学生买了一堆零食，完全没有储蓄。' },
      { sceneNumber: 2, description: '为了跟随潮流，几个同学花掉所有零用钱去买昂贵的盲盒玩具，互相攀比。' },
      { sceneNumber: 3, description: '摊主故意说机器没反应，让紧张的小学生再次刷卡，导致重复扣款。' }
    ]
  },
  {
    theme: '团队合作 (Teamwork)',
    narration: '团结力量大，合作能取得更好的成绩 (Unity is strength; teamwork yields better results)',
    scenes: [
      { sceneNumber: 1, description: '在专题作业讨论中，两个组员为了谁的提议更好而争执不下，最后赌气互不理睬。' },
      { sceneNumber: 2, description: '在篮球比赛中，一名队员不管队友，只想自己表现，结果频繁失误丢分。' },
      { sceneNumber: 3, description: '组长耐心地分配任务，遇到有同学不明白的地方，大家一起帮忙解决，最终完成了出色的海报。' }
    ]
  },
  {
    theme: '户外自然教育与心理健康 (Outdoor Nature Education & Mental Health)',
    narration: '走向户外，强身健体，释放压力 (Stepping outdoors to build strength and relieve stress)',
    scenes: [
      { sceneNumber: 1, description: '在森林学校的探索活动中，有些同学嫌泥土太脏，缩在一旁不敢触碰大自然。' },
      { sceneNumber: 2, description: '放学后，一个男生整天戴着耳机沉浸在网络游戏里，变得不想出门，也不和家人交流。' },
      { sceneNumber: 3, description: '一群学生在老师的带领下在保护区观鸟，大自然的宁静让他们忘记了学业的烦恼，重拾了笑容。' }
    ]
  },
  {
    theme: '种族和谐 (Racial Harmony)',
    narration: '互相尊重，包容不同的文化 (Respecting and embracing different cultures)',
    scenes: [
      { sceneNumber: 1, description: '几个华族同学为了贪图方便，在马来族同学面前大声讲华语，让异族同学感到被孤立。' },
      { sceneNumber: 2, description: '在食堂里，一位同学对印族同学饭盒里的香料味做出捂鼻子的动作，显得非常不尊重。' },
      { sceneNumber: 3, description: '种族和谐日当天，大家穿上各自的传统服装，互相品尝各族美食，气氛欢乐融洽。' }
    ]
  },
  {
    theme: '母语学习 (Mother Tongue Learning)',
    narration: '学好母语，传承文化 (Mastering our mother tongue and passing down our culture)',
    scenes: [
      { sceneNumber: 1, description: '孩子陪父母在牛车水买东西，听到摊主大叔用华语讲述当年的奋斗故事，深受感动。' },
      { sceneNumber: 2, description: '一个学生用机器翻译古诗词，发现虽然字面翻译对了，却失去了那种优美的意境。' },
      { sceneNumber: 3, description: '孙子用流利的华语向只会讲方言的奶奶解释手机的功能，两人开心地聊着天。' }
    ]
  },
  {
    theme: '同理心与设立情绪边界 (Empathy & Setting Emotional Boundaries)',
    narration: '多为别人着想，遇到不公要勇敢发声 (Consider others, and speak up bravely against injustice)',
    scenes: [
      { sceneNumber: 1, description: '在舞蹈排练时，一位同学动作做错了，被其他几个同学无情地嘲笑和模仿。' },
      { sceneNumber: 2, description: '面对同学的嘲笑，一位女生勇敢地站出来，坚定地告诉他们停止这种行为。' },
      { sceneNumber: 3, description: '在分组作业时，有同学以玩游戏为借口不干活，主角拒绝委曲求全，向老师反映了情况。' }
    ]
  },
  {
    theme: '国庆与新加坡人身份认同 (National Day & Singaporean Identity)',
    narration: '热爱新加坡，珍惜和平与稳定 (Loving our nation and cherishing peace and stability)',
    scenes: [
      { sceneNumber: 1, description: '在学校的国庆庆祝会上，有些同学在唱国歌和念信约时有口无心，还在台下互相打闹。' },
      { sceneNumber: 2, description: '看着网上别人去外国旅游的照片，一个学生抱怨新加坡太小太无聊，完全没有意识到本地的治安优势。' },
      { sceneNumber: 3, description: '一家人参加国庆庆典，看着红狮跳伞和国旗飞过，心中充满了自豪感和归属感。' }
    ]
  },
  {
    theme: '行为习惯与公德心 (Behaviour & Civic-mindedness)',
    narration: '良好的习惯，从你我做起 (Good habits start with you and me)',
    scenes: [
      { sceneNumber: 1, description: '一个小男孩在快餐店吃饭时大声喧哗，还故意把番茄酱弄得到处都是。' },
      { sceneNumber: 2, description: '走廊上堆满了纸箱和杂物，阻挡了去路，不仅不美观还可能引起火灾。' },
      { sceneNumber: 3, description: '一个女孩看到地上有纸巾，主动捡起来丢进垃圾桶，并提醒身边的同学不要乱丢垃圾。' }
    ]
  },
  {
    theme: '健康饮食与不浪费食物 (Healthy Diet & Food Waste)',
    narration: '食物宝贵，切勿浪费，保持健康饮食 (Food is precious; do not waste it and maintain a healthy diet)',
    scenes: [
      { sceneNumber: 1, description: '一个男孩因为挑食，吃了几口就把一大盘杂菜饭倒进垃圾桶，妈妈在一旁摇头制止。' },
      { sceneNumber: 2, description: '在超市里，一位学生仔细阅读食品包装上的营养标签，选择较健康选择（Healthier Choice）食品。' },
      { sceneNumber: 3, description: '为了不浪费食物，一家人决定在自助餐厅按自己的食量拿取食物。' }
    ]
  },
  {
    theme: '运动与健康 (Sports & Exercise)',
    narration: '多做运动，保持身心健康 (Exercise regularly to maintain physical and mental well-being)',
    scenes: [
      { sceneNumber: 1, description: '两个女生放学后相约在公园里跑步、打羽毛球，流了一身汗但非常开心。' },
      { sceneNumber: 2, description: '一个男生宁愿坐在家里打电玩吃薯片，也不愿意参加学校的课外体育活动。' },
      { sceneNumber: 3, description: '在体育课上，老师教导大家运动前要做好热身，避免受伤，同学们认真地跟着做。' }
    ]
  },
  {
    theme: '遵守规则与排队 (Following Rules & Queuing)',
    narration: '遵守规则，社会才能井然有序 (Society functions orderly when rules are followed)',
    scenes: [
      { sceneNumber: 1, description: '在食堂买食物时，几个人不顾别人，直接插队到前面，引起了后面同学的不满。' },
      { sceneNumber: 2, description: '在等候上巴士时，所有的乘客都排成一条整齐的队伍，先下后上，非常有秩序。' },
      { sceneNumber: 3, description: '一个男生因为着急，不想排队，结果在推挤中不小心把别人的食物撞翻了。' }
    ]
  },
  {
    theme: '交通安全 (Traffic Safety)',
    narration: '马路如虎口，一定要遵守交通规则 (The road is dangerous; always obey traffic rules)',
    scenes: [
      { sceneNumber: 1, description: '一边走路一边低头看手机的学生，完全没有注意到红绿灯已经变成了红灯，直接走过马路。' },
      { sceneNumber: 2, description: '两个中学生在马路边追逐打闹，其中一个突然冲出马路，差点被飞驰的汽车撞倒。' },
      { sceneNumber: 3, description: '一位交警在路口指挥交通，耐心引导小学生们使用斑马线安全过马路。' }
    ]
  },
  {
    theme: '克服挫折与建立心理韧性 (Overcoming Setbacks & Resilience)',
    narration: '面对挫折，不要轻易放弃 (Don\'t give up easily when facing setbacks)',
    scenes: [
      { sceneNumber: 1, description: '一个学生因为数学预考不及格而灰心丧气，把考卷揉成一团，觉得自己什么都做不好。' },
      { sceneNumber: 2, description: '在父母的鼓励下，他擦干眼泪，开始分析自己的错误，重新复习不懂的知识点。' },
      { sceneNumber: 3, description: '在华乐团练习时，一位女生虽然拉错了几次曲子，但她没有放弃，而是反复练习直到熟练。' }
    ]
  },
  {
    theme: '网络安全与防范霸凌 (Cybersecurity & Cyberbullying)',
    narration: '网络世界要小心，保护自己，也不去伤害别人 (Be careful online; protect yourself and don\'t hurt others)',
    scenes: [
      { sceneNumber: 1, description: '一个学生在网络聊天室里，用恶毒的语言匿名攻击自己的同班同学，导致对方很伤心。' },
      { sceneNumber: 2, description: '在发现自己被网络霸凌后，受害者勇敢地把截图保存下来，并告诉了老师和父母。' },
      { sceneNumber: 3, description: '一位同学在网上看到陌生人索要个人密码和住址，他立刻提高了警惕，拒绝了对方。' }
    ]
  },
  {
    theme: '感恩与学会道谢 (Gratitude & Giving Thanks)',
    narration: '常怀感恩之心，生活才会更美好 (A grateful heart makes life better)',
    scenes: [
      { sceneNumber: 1, description: '母亲节当天，两个孩子偷偷早起准备了早餐，并亲手做了一张贺卡感谢妈妈的辛苦。' },
      { sceneNumber: 2, description: '在学校食堂，一位同学接过食物后，大声地对摊主阿姨说“谢谢您”。' },
      { sceneNumber: 3, description: '有一个小男孩，从爷爷手里拿到了一份生日礼物，不仅当场打开，还抱怨爷爷买的玩具不够好。' }
    ]
  },
  {
    theme: '家庭关系与活动 (Family Relationships & Activities)',
    narration: '多陪伴家人，增进感情 (Spend time with family to strengthen bonds)',
    scenes: [
      { sceneNumber: 1, description: '周末时，一家人放下手机，一起到东海岸公园骑脚踏车、放风筝，充满了欢声笑语。' },
      { sceneNumber: 2, description: '吃晚餐时，父母和孩子各自盯着自己的手机屏幕，餐桌上冷冷清清，没有任何交流。' },
      { sceneNumber: 3, description: '孩子主动帮忙做家务打扫家里，还和父母一起准备晚餐，在厨房里有说有笑。' }
    ]
  },
  {
    theme: '假期安排与休闲活动 (Holiday Plans & Leisure Activities)',
    narration: '合理安排时间，做到劳逸结合 (Manage time wisely for a balance of work and play)',
    scenes: [
      { sceneNumber: 1, description: '学校假期里，一个学生制定了时间表，每天上午复习功课，下午去游泳或看课外书。' },
      { sceneNumber: 2, description: '另一个学生每天睡到中午才起床，剩下的时间都在打电玩，假期过得很空虚。' },
      { sceneNumber: 3, description: '全家人利用假期时间去参观博物馆和科学馆，丰富了课外知识。' }
    ]
  },
  {
    theme: '如何劝导有不良行为的朋友 (Advising Friends with Bad Habits)',
    narration: '近朱者赤，近墨者黑，真诚地帮助朋友改过 (Help friends genuinely to correct their mistakes)',
    scenes: [
      { sceneNumber: 1, description: '看到朋友为了在考试中拿高分企图作弊，一位学生立刻上前低声劝阻。' },
      { sceneNumber: 2, description: '朋友因为一点小事和同学发生冷战，主角推心置腹地听他倾诉，并鼓励他去道歉。' },
      { sceneNumber: 3, description: '看到朋友吃完饭不归还托盘，主角以身作则，一边收拾自己的托盘一边温和地提醒朋友。' }
    ]
  },
  {
    theme: '安静的力量与内向性格 (The Power of Quiet & Introversion)',
    narration: '每个人都有自己的闪光点，静水流深 (Everyone has their own strengths; still waters run deep)',
    scenes: [
      { sceneNumber: 1, description: '在小组讨论时，大家都争着发表意见，唯独一个性格内向的女生安静地在做记录和思考。' },
      { sceneNumber: 2, description: '当组员们发生激烈争吵时，这位安静的女生用平心静气的语气，给出了一个深思熟虑的解决方案。' },
      { sceneNumber: 3, description: '课间休息时，有一位文静的女同学坐在一旁看书，一群同学有说有笑地走过时，对着这个女同学指指点点。' }
    ]
  },
  {
    theme: '诚实与责任感 (Honesty & Sense of Responsibility)',
    narration: '诚实是做人的基本品格。 (Honesty is the foundation of character)',
    scenes: [
      { sceneNumber: 1, description: '一个男孩不小心打破了班里的花盆，他没有逃跑，而是主动向老师承认错误并道歉。' },
      { sceneNumber: 2, description: '捡到一个装满钱的钱包后，两位学生没有起贪念，而是马上交给了警察局。' },
      { sceneNumber: 3, description: '在玩耍时不小心撞倒了别人，一位同学为了怕被骂，不但没道歉还指责是对方没看路。' }
    ]
  }
];

export const ThemeInputForm: React.FC<ThemeInputFormProps> = ({ onStartConfig }) => {
  const [selectedThemeIndex, setSelectedThemeIndex] = useState<number>(0);
  const [customTheme, setCustomTheme] = useState<string>('');
  const [customNarration, setCustomNarration] = useState<string>('');
  const [scenes, setScenes] = useState<VideoScene[]>([
    { sceneNumber: 1, description: '' },
    { sceneNumber: 2, description: '' },
    { sceneNumber: 3, description: '' }
  ]);

  const handlePresetChange = (idx: number) => {
    setSelectedThemeIndex(idx);
    const preset = PRESETS[idx];
    setCustomTheme(preset.theme);
    setCustomNarration(preset.narration);
    setScenes(preset.scenes.map(s => ({ ...s })));
  };

  const handleSceneChange = (index: number, value: string) => {
    const updatedScenes = [...scenes];
    updatedScenes[index].description = value;
    setScenes(updatedScenes);
  };

  const addScene = () => {
    setScenes([...scenes, { sceneNumber: scenes.length + 1, description: '' }]);
  };

  const removeScene = (index: number) => {
    const updatedScenes = scenes.filter((_, i) => i !== index);
    const renumberedScenes = updatedScenes.map((scene, i) => ({
      ...scene,
      sceneNumber: i + 1
    }));
    setScenes(renumberedScenes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartConfig({
      theme: customTheme || PRESETS[selectedThemeIndex].theme,
      narration: customNarration || PRESETS[selectedThemeIndex].narration,
      scenes: scenes.filter(s => s.description.trim() !== '')
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto" style={{ fontFamily: 'Georgia, "Kaiti", "STKaiti", "KaiTi", "楷体", serif', fontSize: '16pt' }}>
      <div className="bg-[#FAF7F2] rounded-3xl overflow-hidden shadow-xl border border-[#EADFCD]">
        
        {/* Header section - Modified to match screenshot palette */}
        <div className="bg-[#F2EFE8] p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h2 className="relative z-10 text-3xl font-bold text-[#4A4643] flex items-center justify-center gap-3 drop-shadow-sm">
            <Sparkles className="h-7 w-7 text-[#99A08F]" />
            PSLE 华文模拟口试练习
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {/* Preset Selector */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-[#6D5C4A] uppercase tracking-wider">
              <BookOpen className="h-5 w-5 text-natural-sage" />
              1. 选择考试主题 (Select Exam Theme)
            </label>
		<p className="text-xs text-gray-500 mt-1 mb-3 font-normal normal-case tracking-normal">
  		从以下 30 个预先设定的口试主题中选择，也可以修改或自定主题。</p>
		<p className="text-xs text-gray-500 mt-1 mb-3 font-normal normal-case tracking-normal">
Please select from the following 30 preset oral themes for your practice. You can also edit or customise with your own theme and scenarios.
		</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-2 border border-[#EADFCD] rounded-xl bg-white shadow-inner custom-scrollbar">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetChange(idx)}
                  className={`text-left px-4 py-3 rounded-lg border transition-all text-sm font-medium ${
                    selectedThemeIndex === idx 
                    ? 'border-[#D8C3A8] bg-[#FAF7F2] text-[#5C4D3C] shadow-sm ring-1 ring-[#D8C3A8]' 
                    : 'border-natural-border bg-white text-natural-text hover:border-[#D8C3A8] hover:bg-[#FAF7F2]/50'
                  }`}
                >
                  {preset.theme}
                </button>
              ))}
            </div>
          </div>

          {/* Theme & Narration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-2xl border border-natural-border shadow-sm">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-natural-muted">
                自定主题 (Customise Theme)
              </label>
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="例如: 保持环境清洁"
                className="w-full rounded-xl border border-natural-border bg-natural-bg px-4 py-3 text-sm focus:border-[#D8C3A8] focus:outline-none focus:ring-2 focus:ring-[#EADFCD] transition-all font-medium text-natural-text placeholder:text-natural-muted/50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-natural-muted">
                录像旁白 (Video Narration)
              </label>
              <input
                type="text"
                value={customNarration}
                onChange={(e) => setCustomNarration(e.target.value)}
                placeholder="例如: 保持环境清洁，人人有责"
                className="w-full rounded-xl border border-natural-border bg-natural-bg px-4 py-3 text-sm focus:border-[#D8C3A8] focus:outline-none focus:ring-2 focus:ring-[#EADFCD] transition-all font-medium text-natural-text placeholder:text-natural-muted/50"
                required
              />
            </div>
          </div>

          {/* Scenes Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-natural-border pb-3">
              <label className="flex items-center gap-2 text-sm font-bold text-[#6D5C4A] uppercase tracking-wider">
                <Video className="h-5 w-5 text-natural-sage" />
                2. 设定录像场景 (Define Video Scenes)
              </label>

              <button
                type="button"
                onClick={addScene}
                className="flex items-center gap-1.5 text-xs font-semibold text-natural-sage hover:text-natural-sage-dark bg-natural-sage/10 hover:bg-natural-sage/20 px-3 py-1.5 rounded-full transition"
              >
                <Plus className="h-3.5 w-3.5" /> 添加场景
              </button>
            </div>
		<p className="text-xs text-gray-500 mt-1 mb-3 font-normal normal-case tracking-normal">
		模拟口试练习将不会提供任何录像，系统会直接朗读旁白和录像场景描述。</p>
		<p className="text-xs text-gray-500 mt-1 mb-3 font-normal normal-case tracking-normal">
		No actual video will be played. Scenario descriptions and narration will be read aloud.</p>
            <div className="space-y-4">
              {scenes.map((scene, idx) => (
                <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-natural-border shadow-sm group">
                  <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-natural-sage/20 text-natural-sage-dark font-bold text-sm border border-natural-sage/30">
                    {scene.sceneNumber}
                  </div>
                  
                  <div className="flex-grow">
                    <textarea
                      value={scene.description}
                      onChange={(e) => handleSceneChange(idx, e.target.value)}
                      placeholder={`场景 ${scene.sceneNumber} 的具体细节...`}
                      className="w-full resize-none rounded-lg border border-natural-border bg-natural-bg px-3 py-2 text-xs sm:text-sm focus:border-[#D8C3A8] focus:outline-none focus:ring-2 focus:ring-[#EADFCD] transition-all font-medium text-natural-text placeholder:text-natural-muted/50"
                      rows={2}
                      required
                    />
                  </div>

                  {scenes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScene(idx)}
                      className="self-start text-natural-muted hover:text-natural-coral-dark p-1.5 rounded-lg hover:bg-natural-coral/10 transition opacity-0 group-hover:opacity-100"
                      title="删除此场景"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-[#EADFCD]">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-natural-coral hover:bg-natural-coral-dark px-6 py-4 text-sm font-bold text-white shadow-lg shadow-natural-coral/20 focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
            >
              <Sparkles className="h-5 w-5" />
              <span>进入看录像说话环节 Start Session</span>
              <ArrowRight className="h-5 w-5" />
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default ThemeInputForm;


