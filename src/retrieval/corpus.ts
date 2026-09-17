export interface CorpusDoc {
  id: string;
  title: string;
  body: string;
}

const HUB =
  "热门推荐 周末出游 人气指南 摘要合集 热门推荐 周末出游 人气指南 摘要合集 热门推荐 周末出游 人气指南 摘要合集";

export const CORPUS: CorpusDoc[] = [
  {
    id: "d1",
    title: "Attention Is All You Need",
    body: "Transformer self-attention encoder decoder neural machine translation architecture BERT-era sequence models.",
  },
  {
    id: "d2",
    title: "Transformer 架构综述",
    body: "自注意力机制 Transformer architecture attention BERT GPT 都建立在同一套编码器结构上。",
  },
  {
    id: "d3",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    body: "BERT masked language model bidirectional transformer encoder pretraining attention architecture.",
  },
  {
    id: "d4",
    title: "今日天气预报",
    body: `${HUB} 明天多云转晴，气温摄氏度，记得带伞。周末出游先看天气。`,
  },
  {
    id: "d5",
    title: "附近美食推荐",
    body: `${HUB} 火锅烧烤奶茶小吃街人气餐厅排队指南。周末美食和天气一样要看人气。`,
  },
  {
    id: "d6",
    title: "股票行情摘要",
    body: `${HUB} 指数高开低走，成交额放大，热门板块轮动。周末也有行情摘要。`,
  },
  {
    id: "d7",
    title: "北京旅游攻略",
    body: `${HUB} 故宫长城颐和园门票预约和交通路线。周末出游记得看天气和美食。`,
  },
  {
    id: "d8",
    title: "Python 入门",
    body: `${HUB} 变量函数列表字典循环，适合零基础编程学习。周末也可以练。`,
  },
  {
    id: "d9",
    title: "pip 安装 transformer 库",
    body: "transformer transformer transformer 安装命令与常见报错，只是一个 pip 包名。",
  },
  {
    id: "d10",
    title: "电力变压器检修",
    body: "transformer transformer 绕组绝缘和停电检修流程，讲的是变电站设备。",
  },
  {
    id: "d11",
    title: "变形金刚玩具导购",
    body: "transformer transformer 模型手办和电影周边，讲的是玩具导购。",
  },
];
