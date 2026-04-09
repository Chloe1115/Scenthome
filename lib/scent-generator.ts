import { EXPERIENCE_STATES } from "@/lib/constants";
import type { GeneratedScentProfile } from "@/lib/types";

type Theme = {
  keywords: string[];
  title: string[];
  summaries: string[];
  tags: string[];
  atmosphere: string;
  visualDescription: string;
  archiveNote: string;
};

const THEMES: Theme[] = [
  {
    keywords: ["雨", "潮湿", "雨后", "木头", "青苔", "cedar", "rain"],
    title: ["雨落旧木巷", "雨后的老屋檐", "潮声与木香"],
    summaries: [
      "以湿润泥土、旧木梁与微凉空气为核心，还原雨后故乡巷子的安静层次。",
      "这支方案突出潮湿木香、檐下水汽与旧宅气息，适合细腻而绵长的乡愁记忆。",
    ],
    tags: ["湿土", "雪松", "青苔", "臭氧"],
    atmosphere: "清冷、安静、带一点回潮感",
    visualDescription: "旧木门廊、雨线与被打湿的青石路在晨光里慢慢亮起来。",
    archiveNote: "适合和深呼吸节奏一起体验，前 10 秒最容易唤起空间记忆。",
  },
  {
    keywords: ["厨房", "饭", "炊烟", "灶", "面", "饺子", "soup", "bread"],
    title: ["灶台边的晚饭香", "炊烟归家时", "热气里的团圆"],
    summaries: [
      "围绕米香、蒸汽、柴火和温暖木质调展开，适合带有家庭团聚感的记忆。",
      "这支方案更偏温热与抚慰，像傍晚厨房里慢慢升起的烟火气。",
    ],
    tags: ["米香", "炊烟", "暖木", "香草"],
    atmosphere: "温暖、亲密、稳定",
    visualDescription: "厨房玻璃泛着水汽，锅里热气翻涌，木桌边有人在等你坐下。",
    archiveNote: "建议中等强度体验，更容易感受到家的包裹感。",
  },
  {
    keywords: ["海", "海风", "渔港", "海边", "盐", "beach", "sea"],
    title: ["海风吹回来的下午", "潮汐边的故乡", "盐味记忆档案"],
    summaries: [
      "融合海盐、风感、湿润矿物感与一点晒过太阳的木头味，层次开阔。",
      "更偏向清新与明亮，适合海边成长记忆或离海很久后的思乡感。",
    ],
    tags: ["海盐", "风感", "矿石", "漂流木"],
    atmosphere: "清爽、开阔、明亮",
    visualDescription: "白色浪花掠过礁石，空气带着咸味和阳光烘过的潮气。",
    archiveNote: "适合较高强度体验，能更快把空间感拉出来。",
  },
  {
    keywords: ["花", "花园", "茉莉", "桂花", "garden", "flower"],
    title: ["外婆院子的清晨", "花影与泥土", "晨露里的花香"],
    summaries: [
      "以花香、晨露、泥土和柔软木质为核心，还原院子里最柔和的记忆。",
      "这支方案适合温柔、细碎、带人物关系感的回忆，香调会更轻盈。",
    ],
    tags: ["茉莉", "桂花", "湿叶", "泥土"],
    atmosphere: "柔和、温柔、明净",
    visualDescription: "带露水的花瓣贴着泥土，空气里有刚醒来的清香和日光。",
    archiveNote: "前调偏轻，建议给自己 20 秒完整体验时间。",
  },
  {
    keywords: ["茶", "书", "纸", "教室", "school", "book", "tea"],
    title: ["旧书页与茶香", "课桌边的午后", "纸页里的故乡气味"],
    summaries: [
      "突出旧纸、茶叶、木桌和日光尘埃感，适合安静、缓慢、内向型记忆。",
      "如果你的记忆更像一个场景切片，这支配方会更聚焦在细节与空气感。",
    ],
    tags: ["旧纸", "茶叶", "木桌", "日光尘埃"],
    atmosphere: "安静、柔和、克制",
    visualDescription: "阳光斜落在旧书页上，茶香在空气里慢慢散开，时间像放慢了。",
    archiveNote: "建议低到中等强度，更适合沉浸式回味。",
  },
];

function hash(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function chooseTheme(narrative: string) {
  const lowerNarrative = narrative.toLowerCase();

  const matchedTheme =
    THEMES.find((theme) =>
      theme.keywords.some((keyword) => lowerNarrative.includes(keyword.toLowerCase())),
    ) ?? THEMES[hash(narrative) % THEMES.length];

  return matchedTheme;
}

export function generateScentProfile(
  narrative: string,
  emotions: string[],
  hasImage: boolean,
): GeneratedScentProfile {
  const theme = chooseTheme(narrative);
  const seed = hash(`${narrative}-${emotions.join("-")}-${hasImage}`);
  const title = theme.title[seed % theme.title.length];
  const summary = theme.summaries[seed % theme.summaries.length];
  const intensityLabel = emotions.includes("思念")
    ? "层次偏深"
    : emotions.includes("喜悦")
      ? "明亮轻盈"
      : emotions.includes("安心")
        ? "温柔包裹"
        : "柔和细腻";

  const price = 129 + (seed % 3) * 20;
  const emotionTags = emotions.length > 0 ? emotions : ["怀旧", "平静"];
  const visualDescription = hasImage
    ? `${theme.visualDescription} 由于你上传了图片，方案里额外强化了场景细节的还原度。`
    : theme.visualDescription;

  return {
    title,
    summary,
    scentTags: theme.tags,
    emotionTags,
    atmosphere: theme.atmosphere,
    intensityLabel,
    price,
    productName: `${title} 定制香氛体验套组`,
    ritualSteps: [
      "前调：先释放最容易被瞬间识别的场景线索。",
      "中调：拉起人物关系和空间温度，让记忆变得更完整。",
      "尾调：留下可持续停留的故乡底色，延长回味时间。",
    ],
    aiStages: EXPERIENCE_STATES,
    visualDescription,
    archiveNote: theme.archiveNote,
  };
}
