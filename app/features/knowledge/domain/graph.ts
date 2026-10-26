export type GraphPoint3D = {
    x: number;
    y: number;
    z: number;
};
export type SemanticTopic = GraphPoint3D & {
    id: string;
    name: string;
    categories: string[];
    keywords: string[];
    color: string;
};
export const graphCategories: Array<GraphPoint3D & {
    name: string;
    displayName?: string;
}> = [
    { name: "机械", x: -0.92, y: -0.38, z: -0.12 },
    { name: "电气", x: -0.35, y: 0.72, z: 0.14 },
    { name: "机器人", x: 0.72, y: 0.43, z: 0.18 },
    { name: "车辆", displayName: "汽车", x: 0.94, y: -0.34, z: -0.08 },
    { name: "系统", x: 0.05, y: -0.82, z: -0.18 },
    { name: "嵌入式", x: -0.72, y: 0.34, z: -0.22 },
    { name: "通用", x: 0.05, y: 0.12, z: -0.72 },
];
export const semanticTopics: SemanticTopic[] = [
    {
        id: "motor",
        name: "电机",
        x: 0.25,
        y: 0.18,
        z: 0.58,
        categories: ["电气", "机器人", "车辆"],
        keywords: ["电机", "电驱", "伺服", "驱动", "逆变器"],
        color: "#d6aa70",
    },
    {
        id: "sensor",
        name: "传感器",
        x: -0.12,
        y: 0.44,
        z: 0.48,
        categories: ["机器人", "车辆", "嵌入式"],
        keywords: ["传感器", "雷达", "视觉", "定位", "ADC"],
        color: "#79b7b0",
    },
    {
        id: "control",
        name: "控制算法",
        x: 0.34,
        y: -0.28,
        z: 0.42,
        categories: ["系统", "机器人", "车辆"],
        keywords: ["控制", "算法", "PID", "轨迹", "状态空间"],
        color: "#8ba6d4",
    },
    {
        id: "bus",
        name: "通信总线",
        x: -0.42,
        y: 0.02,
        z: 0.38,
        categories: ["嵌入式", "车辆", "系统"],
        keywords: ["CAN", "通信", "总线", "RTOS", "协议"],
        color: "#8e9fc5",
    },
    {
        id: "mechanism",
        name: "结构传动",
        x: -0.28,
        y: -0.36,
        z: 0.3,
        categories: ["机械", "机器人", "车辆"],
        keywords: ["结构", "齿轮", "轴承", "传动", "机械臂"],
        color: "#c8a86c",
    },
    {
        id: "simulation",
        name: "仿真建模",
        x: 0.02,
        y: -0.52,
        z: 0.3,
        categories: ["系统", "机械", "车辆", "机器人"],
        keywords: ["仿真", "模型", "Simulink", "动力学", "有限元"],
        color: "#87a98c",
    },
];
export function projectGraphPoint(point: GraphPoint3D, rotateX: number, rotateY: number) {
    const rx = (rotateX * Math.PI) / 180;
    const ry = (rotateY * Math.PI) / 180;
    const x1 = point.x * Math.cos(ry) + point.z * Math.sin(ry);
    const z1 = -point.x * Math.sin(ry) + point.z * Math.cos(ry);
    const y1 = point.y * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = point.y * Math.sin(rx) + z1 * Math.cos(rx);
    const perspective = Math.max(0.72, 1 + z2 * 0.22);
    return {
        left: 50 + x1 * 36 * perspective,
        top: 50 + y1 * 38 * perspective,
        depth: z2,
        scale: Math.max(0.72, Math.min(1.3, 1 + z2 * 0.2)),
        zIndex: Math.round(40 + z2 * 20),
    };
}
export function distributeGraphCategories(points: Array<GraphPoint3D & {
    name: string;
    displayName?: string;
}>) {
    const count = Math.max(1, points.length);
    return points.map((point, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
        return {
            ...point,
            x: Math.cos(angle) * 0.84,
            y: Math.sin(angle) * 0.77,
            z: ((index % 3) - 1) * 0.12,
        };
    });
}
export function distributeGraphTopics<T extends SemanticTopic>(points: T[]): T[] {
    const categories = distributeGraphCategories(graphCategories);
    const categoryByName = new Map(categories.map((category) => [category.name, category]));
    const count = Math.max(1, points.length);
    const availableSlots = points.map((_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
        const radius = index % 2 ? 0.58 : 0.5;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.9,
            z: ((index % 4) - 1.5) * 0.11,
        };
    });
    const ranked = points
        .map((point) => {
        const related = point.categories
            .map((name) => categoryByName.get(name))
            .filter(Boolean) as Array<GraphPoint3D & {
            name: string;
        }>;
        const centroid = related.reduce((sum, category) => ({ x: sum.x + category.x, y: sum.y + category.y }), { x: 0, y: 0 });
        const count = Math.max(1, related.length);
        return {
            point,
            target: {
                x: (centroid.x / count) * 0.68,
                y: (centroid.y / count) * 0.68,
            },
        };
    })
        .sort((a, b) => Math.atan2(a.target.y, a.target.x) - Math.atan2(b.target.y, b.target.x));
    return ranked.map(({ point, target }) => {
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        availableSlots.forEach((slot, index) => {
            const distance = Math.hypot(slot.x - target.x, slot.y - target.y);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        });
        const slot = availableSlots.splice(bestIndex, 1)[0];
        return { ...point, ...slot };
    });
}
export const optimizedGraphCategories = distributeGraphCategories(graphCategories);
