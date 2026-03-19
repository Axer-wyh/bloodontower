const { AI_HOST_INTENTS } = require("./constants");
const { getVisibleRoomState } = require("./room-state");

function buildAIHostDecisionSchema() {
  return {
    type: "object",
    required: ["intent", "message", "target", "requires_confirmation", "safety_flags"],
    properties: {
      intent: {
        type: "string",
        enum: AI_HOST_INTENTS.slice(),
      },
      message: {
        type: "string",
      },
      target: {
        type: "object",
        required: ["scope", "player_ids"],
        properties: {
          scope: {
            type: "string",
            enum: ["public", "host", "private_player", "system"],
          },
          player_ids: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
      requires_confirmation: {
        type: "boolean",
      },
      safety_flags: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  };
}

function validateAIHostDecision(decision) {
  if (!decision || typeof decision !== "object") {
    throw new Error("AIHostDecision must be an object.");
  }
  if (AI_HOST_INTENTS.indexOf(decision.intent) === -1) {
    throw new Error("Invalid AI host intent.");
  }
  if (typeof decision.message !== "string" || decision.message.length === 0) {
    throw new Error("AI host message is required.");
  }
  if (!decision.target || typeof decision.target !== "object") {
    throw new Error("AI host target is required.");
  }
  if (!Array.isArray(decision.target.player_ids)) {
    throw new Error("AI host target.player_ids must be an array.");
  }
  if (typeof decision.requires_confirmation !== "boolean") {
    throw new Error("AI host requires_confirmation must be boolean.");
  }
  if (!Array.isArray(decision.safety_flags)) {
    throw new Error("AI host safety_flags must be an array.");
  }
  return true;
}

function createAIHostSystemPrompt() {
  return [
    "你是血染钟楼的 AI 说书人。",
    "必须先服从程序提供的房间状态和规则硬约束，再决定主持文案。",
    "你不能擅自修改游戏状态，也不能泄露玩家私密身份。",
    "你必须输出结构化 JSON，字段严格为 intent, message, target, requires_confirmation, safety_flags。",
    "当规则冲突、信息不足或行为可能破坏保密性时，requires_confirmation 必须为 true。",
  ].join("\n");
}

function buildAIHostContext(room, options) {
  const visibleRoom = getVisibleRoomState(room, options || { viewerRole: "host" });
  return {
    taskSummary: "根据当前房间状态生成下一步主持动作，默认由主持确认。",
    room: visibleRoom,
    constraints: [
      "不得修改房间状态",
      "不得越权泄露私密身份",
      "不得绕过提名、投票和夜序规则",
      "规则不确定时必须请求确认",
    ],
    outputSchema: buildAIHostDecisionSchema(),
  };
}

module.exports = {
  buildAIHostDecisionSchema,
  validateAIHostDecision,
  createAIHostSystemPrompt,
  buildAIHostContext,
};

