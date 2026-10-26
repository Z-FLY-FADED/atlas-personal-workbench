import type { JobApplication, Task } from "../../../contracts/workspace";
export const initialTasks: Task[] = [];
export const initialApplications: JobApplication[] = [
    {
        id: 1,
        company: "某智能制造企业",
        role: "机器人控制工程师",
        status: "面试",
        channel: "BOSS直聘",
        appliedAt: "8月2日",
        nextAction: "准备控制算法项目复盘",
        notes: "重点梳理 Simulink 与运动控制经历",
    },
    {
        id: 2,
        company: "某新能源汽车公司",
        role: "车辆系统工程师",
        status: "已投递",
        channel: "官网",
        appliedAt: "8月1日",
        nextAction: "8月8日前跟进",
        notes: "已使用车辆系统版简历",
    },
];
