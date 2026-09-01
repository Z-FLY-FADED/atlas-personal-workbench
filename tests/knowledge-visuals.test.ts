import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getKnowledgeTextbookMedia,
  getKnowledgeVisualProfile,
} from "../app/page";
import { CURATED_MAINSTREAM_KNOWLEDGE } from "../app/knowledge-mainstream";

const visualCases = [
  ["STM32 CAN 通信故障排查", "嵌入式 RTOS与通信", "can"],
  ["永磁同步电机的矢量控制", "电气 电机与驱动", "motor"],
  ["ROS 机器人操作系统：ROS 1 与 ROS 2", "机器人 ROS与中间件", "ros"],
  ["机器人训练：数据、仿真、策略与真机部署", "机器人 机器人训练", "robot-training"],
  ["强化学习基础：MDP、价值函数与 Bellman 方程", "系统 智能算法", "reinforcement"],
  ["汽车四冲程发动机与奥托循环原理", "车辆 发动机与动力", "engine"],
  ["RTOS 调度、同步与实时性分析", "嵌入式 RTOS与通信", "rtos"],
  ["嵌入式硬件接口：GPIO、ADC、PWM、SPI、I²C 与 UART", "嵌入式 硬件接口", "interface"],
  ["嵌入式系统基础：MCU、存储、中断与 DMA", "嵌入式 MCU与固件", "embedded"],
  ["机械基础：受力分析、平衡与强度", "机械 机械基础", "mechanics"],
  ["机械臂末端轨迹规划与速度约束", "机器人 运动控制", "robot"],
  ["齿轮箱轴承寿命计算方法", "机械 传动机构", "bearing"],
  ["车辆悬架 Simulink 建模记录", "车辆 底盘与动力", "suspension"],
  ["控制系统稳定性分析清单", "系统 控制理论", "control"],
] as const;

test("knowledge visuals match every bundled subject family", () => {
  for (const [title, category, expectedKind] of visualCases) {
    const profile = getKnowledgeVisualProfile(title, category);
    assert.equal(profile.kind, expectedKind, title);
    assert.ok(profile.purpose.length >= 20, `${title} 缺少主要作用说明`);
    assert.ok(profile.caption.length >= 20, `${title} 缺少读图说明`);
    assert.equal(profile.structure.length, 4, `${title} 结构节点不完整`);
    assert.equal(profile.codeFlow.length, 4, `${title} 流程节点不完整`);

    const media = getKnowledgeTextbookMedia(title, category);
    assert.ok(media.src.startsWith("/knowledge-"), `${title} 缺少图片`);
    assert.ok(media.title.length >= 6, `${title} 缺少图片标题`);
    assert.ok(media.caption.length >= 30, `${title} 图片说明过短`);
    assert.ok(media.source.length >= 6, `${title} 缺少图片来源`);
  }
});

test("unknown knowledge still receives a useful visual explanation", () => {
  const profile = getKnowledgeVisualProfile("项目复盘方法", "通用 工作方法");
  assert.equal(profile.kind, "general");
  assert.equal(profile.visualLabel, "系统关系图");
  assert.ok(profile.purpose.includes("输入"));

  const media = getKnowledgeTextbookMedia("项目复盘方法", "通用 工作方法");
  assert.ok(media.caption.includes("概念"));
  assert.ok(media.source.includes("项目内置"));
});

test("major topics use content-specific title images", () => {
  const expectedMedia = [
    ["ROS 2 DDS 与 QoS", "机器人 ROS与中间件", "/knowledge-ros-network.png"],
    ["PPO 强化学习", "系统 智能算法", "/knowledge-rl-algorithms.png"],
    ["RTOS 任务调度", "嵌入式 RTOS与通信", "/knowledge-rtos-scheduler.png"],
    ["机械基础受力分析", "机械 机械基础", "/knowledge-mechanics-load-path.png"],
  ] as const;

  for (const [title, category, expectedSrc] of expectedMedia) {
    assert.equal(getKnowledgeTextbookMedia(title, category).src, expectedSrc);
  }

  const canMedia = getKnowledgeTextbookMedia(
    "STM32 CAN 通信故障排查",
    "嵌入式 RTOS与通信",
  );
  assert.equal(canMedia.cardSrc, "/knowledge-reference-atlas.png");
  assert.equal(canMedia.cardBackgroundPosition, "100% 0%");

  const controlMedia = getKnowledgeTextbookMedia(
    "控制系统稳定性分析清单",
    "系统 控制理论",
  );
  assert.equal(controlMedia.cardBackgroundPosition, "100% 100%");
});

test("every curated knowledge entry has matched imagery and explanatory captions", () => {
  const coverPaths: string[] = [];
  const captions: string[] = [];

  for (const item of CURATED_MAINSTREAM_KNOWLEDGE) {
    const category = `${item.primaryCategory} ${item.secondaryCategory}`;
    const profile = getKnowledgeVisualProfile(item.title, category);
    const media = getKnowledgeTextbookMedia(item.title, category);
    assert.notEqual(profile.kind, "general", `${item.title} 未匹配专业图示`);
    assert.ok(profile.visualLabel.endsWith("图"), `${item.title} 缺少图示类型`);
    assert.ok(profile.purpose.length >= 20, `${item.title} 缺少主要作用`);
    assert.ok(media.caption.length >= 30, `${item.title} 图片说明不完整`);
    assert.ok(media.source.length >= 6, `${item.title} 缺少图片来源`);
    assert.equal(media.details?.length, 3, `${item.title} 缺少分层读图说明`);
    for (const detail of media.details || []) {
      assert.ok(detail.label.length >= 4, `${item.title} 图片说明标签不完整`);
      assert.ok(detail.value.length >= 20, `${item.title} 的“${detail.label}”说明过短`);
    }
    assert.ok(
      existsSync(join(process.cwd(), "public", media.src.slice(1))),
      `${item.title} 图片文件不存在：${media.src}`,
    );
    coverPaths.push(media.cardSrc || media.src);
    captions.push(media.caption);
  }

  assert.equal(
    new Set(coverPaths).size,
    CURATED_MAINSTREAM_KNOWLEDGE.length,
    "基础知识条目存在重复封面",
  );
  assert.equal(
    new Set(captions).size,
    CURATED_MAINSTREAM_KNOWLEDGE.length,
    "基础知识条目存在重复图片说明",
  );
});
