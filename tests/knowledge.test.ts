import assert from "node:assert/strict";
import test from "node:test";
import { analyzeKnowledgeContent, rankKnowledgeRelations } from "../app/knowledge-intelligence";
import { classifyKnowledge } from "../app/knowledge-taxonomy";

test("classifyKnowledge recognizes embedded systems content", () => {
  const result = classifyKnowledge("STM32 MCU 使用 FreeRTOS，通过 CAN 与 SPI 采集传感器数据");
  assert.equal(result.primaryCategory, "嵌入式");
  assert.ok(["MCU与固件", "RTOS与通信", "硬件接口"].includes(result.secondaryCategory));
  assert.ok(result.confidence >= 66);
});

test("analyzeKnowledgeContent produces useful structured metadata", () => {
  const result = analyzeKnowledgeContent({
    title: "未命名知识",
    content: "ROS 2 使用 DDS 和 QoS 管理机器人通信。合理配置可靠性与历史深度，可以降低传感器 Topic 丢包风险。",
  });
  assert.equal(result.primaryCategory, "机器人");
  assert.equal(result.secondaryCategory, "ROS与中间件");
  assert.ok(result.keywords.some((item) => /ROS/i.test(item)));
  assert.ok(result.summary.length > 10);
});

test("rankKnowledgeRelations prioritizes shared topics and keywords", () => {
  const current = { id: 1, title: "ROS 2 QoS", summary: "DDS 通信", primaryCategory: "机器人", secondaryCategory: "ROS与中间件", keywords: ["ROS", "DDS"], relatedTopics: ["ROS与中间件"] };
  const ranked = rankKnowledgeRelations(current, [
    { id: 2, title: "DDS 可靠性", summary: "ROS 通信配置", primaryCategory: "机器人", secondaryCategory: "ROS与中间件", keywords: ["ROS", "DDS"], relatedTopics: ["ROS与中间件"] },
    { id: 3, title: "齿轮材料", summary: "热处理", primaryCategory: "机械", secondaryCategory: "材料与工艺", keywords: ["齿轮"], relatedTopics: ["机械结构"] },
  ]);
  assert.deepEqual(ranked.map((item) => item.id), [2]);
  assert.ok(ranked[0].score >= 10);
});
