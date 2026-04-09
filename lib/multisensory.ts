import type { GeneratedScentProfile } from "@/lib/types";

export type SoundPreset = "garden" | "rain" | "kitchen" | "sea" | "night";
export type VisualPreset = "mist" | "amber" | "breeze" | "ember" | "coast";

export type ExperienceScene = {
  id: string;
  title: string;
  narration: string;
  duration: number;
  soundPreset: SoundPreset;
  visualPreset: VisualPreset;
  stepLabel: string;
  noteLabel: string;
  noteText: string;
};

export type ExperiencePlan = {
  themeLabel: string;
  soundLabel: string;
  visualLabel: string;
  notePyramid: Array<{
    key: "top" | "middle" | "base";
    stageLabel: string;
    noteLabel: string;
    notes: string[];
  }>;
  scenes: ExperienceScene[];
};

function pickTheme(profile: GeneratedScentProfile, narrative: string, emotions: string[]) {
  const bundle = [
    profile.summary,
    profile.atmosphere,
    profile.visualDescription,
    profile.archiveNote,
    profile.scentTags.join(" "),
    profile.emotionTags.join(" "),
    emotions.join(" "),
    narrative,
  ]
    .join(" ")
    .toLowerCase();

  if (/(海|海风|海边|潮湿|盐|港口)/.test(bundle)) {
    return {
      soundPreset: "sea" as const,
      visualPreset: "coast" as const,
      themeLabel: "海风回响",
      soundLabel: "潮汐轻旋律",
      visualLabel: "冷暖交叠的海雾光感",
    };
  }

  if (/(雨|雨后|湿土|泥土|潮|青苔)/.test(bundle)) {
    return {
      soundPreset: "rain" as const,
      visualPreset: "mist" as const,
      themeLabel: "雨后回场",
      soundLabel: "雨后轻旋律",
      visualLabel: "湿润雾感与流动光晕",
    };
  }

  if (/(厨房|灶|米饭|锅|蒸汽|炊烟|木桌)/.test(bundle)) {
    return {
      soundPreset: "kitchen" as const,
      visualPreset: "ember" as const,
      themeLabel: "厨房余温",
      soundLabel: "暖光轻旋律",
      visualLabel: "琥珀暖光与蒸汽层次",
    };
  }

  if (/(夜|月|灯|安静|平静|安心)/.test(bundle)) {
    return {
      soundPreset: "night" as const,
      visualPreset: "amber" as const,
      themeLabel: "夜色停留",
      soundLabel: "夜色轻旋律",
      visualLabel: "深色余晖与慢速光影",
    };
  }

  return {
    soundPreset: "garden" as const,
    visualPreset: "breeze" as const,
    themeLabel: "院落晚风",
    soundLabel: "晚风轻旋律",
    visualLabel: "空气流动与金色粒子",
  };
}

function joinTags(tags: string[], fallback: string) {
  return tags.slice(0, 3).join("、") || fallback;
}

function parseRitualStep(step: string, index: number) {
  const trimmed = step.trim();
  const [rawLabel, ...restParts] = trimmed.split("：");
  const fallbackStepLabel = `第${index + 1}步`;
  const stepLabel = restParts.length > 0 ? rawLabel.trim() : fallbackStepLabel;
  const content = restParts.length > 0 ? restParts.join("：").trim() : trimmed;
  const noteLabel = content.includes("前调")
    ? "前调"
    : content.includes("中调")
      ? "中调"
      : content.includes("尾调") || content.includes("后调")
        ? "后调"
        : index === 0
          ? "前调"
          : index === 1
            ? "中调"
            : "后调";
  const noteText = content
    .replace("前调", "")
    .replace("中调", "")
    .replace("尾调", "")
    .replace("后调", "")
    .replace(/[，。]/g, " ")
    .trim();

  return {
    stepLabel,
    noteLabel,
    content,
    noteText: noteText || content,
  };
}

function resolveNoteLayers(profile: GeneratedScentProfile) {
  if (profile.ritualSteps.length >= 3) {
    return profile.ritualSteps.slice(0, 3).map((step, index) => {
      const parsed = parseRitualStep(step, index);

      return {
        key: (index === 0 ? "top" : index === 1 ? "middle" : "base") as "top" | "middle" | "base",
        stageLabel: parsed.stepLabel,
        noteLabel: parsed.noteLabel,
        notes: [parsed.noteText],
      };
    });
  }

  const tags = profile.scentTags.filter(Boolean);
  const fallbackTop = tags[0] ?? profile.atmosphere;
  const fallbackMiddle = tags[1] ?? profile.emotionTags[0] ?? "暖意";
  const fallbackBase = tags.at(-1) ?? profile.intensityLabel ?? "余韵";

  return [
    {
      key: "top" as const,
      stageLabel: "第一步",
      noteLabel: "前调",
      notes: tags.slice(0, 2).length > 0 ? tags.slice(0, 2) : [fallbackTop],
    },
    {
      key: "middle" as const,
      stageLabel: "第二步",
      noteLabel: "中调",
      notes: tags.slice(2, 4).length > 0 ? tags.slice(2, 4) : [fallbackMiddle],
    },
    {
      key: "base" as const,
      stageLabel: "第三步",
      noteLabel: "后调",
      notes: tags.slice(4, 6).length > 0 ? tags.slice(4, 6) : [fallbackBase],
    },
  ];
}

export function deriveExperiencePlan(
  profile: GeneratedScentProfile,
  narrative: string,
  emotions: string[],
): ExperiencePlan {
  const theme = pickTheme(profile, narrative, emotions);
  const notePyramid = resolveNoteLayers(profile);
  const emotionLine = joinTags(profile.emotionTags.length > 0 ? profile.emotionTags : emotions, "安心");
  const visualLine = profile.visualDescription.replace(/\s+/g, " ").trim();
  const archiveLine = profile.archiveNote.replace(/\s+/g, " ").trim();
  const atmosphereLine = profile.atmosphere.trim();
  const topNote = notePyramid[0]?.notes[0] ?? profile.scentTags[0] ?? atmosphereLine;
  const middleNote = notePyramid[1]?.notes[0] ?? profile.scentTags[1] ?? emotionLine;
  const baseNote = notePyramid[2]?.notes[0] ?? profile.scentTags.at(-1) ?? profile.intensityLabel;

  if (profile.ritualSteps.length >= 3) {
    const ritualScenes = profile.ritualSteps.slice(0, 3).map((step, index) => {
      const parsed = parseRitualStep(step, index);

      return {
        id: index === 0 ? "entry" : index === 1 ? "unfold" : "settle",
        title: parsed.noteLabel,
        narration: parsed.content,
        duration: index === 1 ? 16 : 14,
        soundPreset: theme.soundPreset,
        visualPreset: theme.visualPreset,
        stepLabel: parsed.stepLabel,
        noteLabel: parsed.noteLabel,
        noteText: parsed.noteText,
      };
    });

    return {
      themeLabel: theme.themeLabel,
      soundLabel: theme.soundLabel,
      visualLabel: theme.visualLabel,
      notePyramid,
      scenes: ritualScenes,
    };
  }

  return {
    themeLabel: theme.themeLabel,
    soundLabel: theme.soundLabel,
    visualLabel: theme.visualLabel,
    notePyramid,
    scenes: [
      {
        id: "entry",
        title: "前调",
        narration: `${topNote} 先轻轻靠近，像场景最亮的一层气息刚被风带出来。`,
        duration: 14,
        soundPreset: theme.soundPreset,
        visualPreset: theme.visualPreset,
        stepLabel: "第一步",
        noteLabel: "前调",
        noteText: topNote,
      },
      {
        id: "unfold",
        title: "中调",
        narration: `${middleNote} 慢慢铺开，空气和光线都跟着柔下来。`,
        duration: 16,
        soundPreset: theme.soundPreset,
        visualPreset: theme.visualPreset,
        stepLabel: "第二步",
        noteLabel: "中调",
        noteText: middleNote,
      },
      {
        id: "settle",
        title: "后调",
        narration: `${baseNote} 安静留下，把更长的余味慢慢贴在空气里。`,
        duration: 14,
        soundPreset: theme.soundPreset,
        visualPreset: theme.visualPreset,
        stepLabel: "第三步",
        noteLabel: "后调",
        noteText: baseNote,
      },
    ],
  };
}
