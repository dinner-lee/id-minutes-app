export const PRESETS = {
    ADDIE: {
      name: "ADDIE",
      stages: ["Analyze", "Design", "Develop", "Implement", "Evaluate"],
    },
    DCC: {
      name: "Dick, Carey & Carey",
      stages: [
        "Identify instructional goal",
        "Conduct instructional analysis",
        "Analyze learners and contexts",
        "Write performance objectives",
        "Develop assessment instruments",
        "Develop instructional strategy",
        "Develop and select instructional materials",
        "Design and conduct formative evaluation",
        "Design and conduct summative evaluation",
      ],
    },
    RPISD: {
      name: "RPISD",
      stages: ["Analyze", "Design", "Prototype", "Implement", "Evaluate"],
    },
} as const;
