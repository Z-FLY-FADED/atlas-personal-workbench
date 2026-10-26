"use client";
export const technicalKeywordPattern = /^(必须|关键|核心|约束|边界|验证|风险|CAN|PMSM|FOC|MTPA|SVPWM|Bus-Off|L10|五次多项式|jerk|MPC|H∞|Lyapunov|相位裕度|增益裕度|采样点|终端电阻|电流环|速度环)$/;
export function emphasizeTechnicalText(text: string) {
    return text
        .split(/(必须|关键|核心|约束|边界|验证|风险|CAN|PMSM|FOC|MTPA|SVPWM|Bus-Off|L10|五次多项式|jerk|MPC|H∞|Lyapunov|相位裕度|增益裕度|采样点|终端电阻|电流环|速度环)/g)
        .map((part, index) => technicalKeywordPattern.test(part) ? (<strong key={`${part}-${index}`}>{part}</strong>) : (part));
}
