"use client";
import katex from "katex";
const standardizedFormulaMap: Record<string, string> = {
    "t_bit = (1 + TSEG1 + TSEG2) × BRP / f_CAN；BitRate = 1 / t_bit": String.raw `t_{\mathrm{bit}}=\frac{(1+\mathrm{TSEG1}+\mathrm{TSEG2})\,\mathrm{BRP}}{f_{\mathrm{CAN}}},\qquad \mathrm{BitRate}=\frac{1}{t_{\mathrm{bit}}}`,
    "SamplePoint = (1 + TSEG1) / (1 + TSEG1 + TSEG2) × 100%": String.raw `\mathrm{SamplePoint}=\frac{1+\mathrm{TSEG1}}{1+\mathrm{TSEG1}+\mathrm{TSEG2}}\times100\%`,
    "R_bus = R_T1 ∥ R_T2 = (R_T1 × R_T2) / (R_T1 + R_T2)": String.raw `R_{\mathrm{bus}}=R_{\mathrm{T1}}\parallel R_{\mathrm{T2}}=\frac{R_{\mathrm{T1}}R_{\mathrm{T2}}}{R_{\mathrm{T1}}+R_{\mathrm{T2}}}`,
    "u_d = R_s i_d + L_d·di_d/dt − ω_e L_q i_q；u_q = R_s i_q + L_q·di_q/dt + ω_e(L_d i_d + ψ_f)": String.raw `\begin{aligned}u_d&=R_s i_d+L_d\frac{\mathrm di_d}{\mathrm dt}-\omega_eL_qi_q\\u_q&=R_s i_q+L_q\frac{\mathrm di_q}{\mathrm dt}+\omega_e\left(L_di_d+\psi_f\right)\end{aligned}`,
    "T_e = 3p/2 · [ψ_f i_q + (L_d − L_q)i_d i_q]": String.raw `T_e=\frac{3p}{2}\left[\psi_f i_q+\left(L_d-L_q\right)i_d i_q\right]`,
    "J·dω_m/dt = T_e − T_L − Bω_m": String.raw `J\frac{\mathrm d\omega_m}{\mathrm dt}=T_e-T_L-B\omega_m`,
    "L_10 = (C/P)^p × 10⁶ rev；L_10h = L_10 / (60n)": String.raw `L_{10}=\left(\frac{C}{P}\right)^p\times10^6\,\mathrm{rev},\qquad L_{10h}=\frac{L_{10}}{60n}`,
    "P = X F_r + Y F_a": String.raw `P=XF_r+YF_a`,
    "P_eq = [Σ(P_i^p n_i t_i) / Σ(n_i t_i)]^(1/p)": String.raw `P_{\mathrm{eq}}=\left[\frac{\sum_i P_i^p n_i t_i}{\sum_i n_i t_i}\right]^{1/p}`,
    "q(t)=a₀+a₁t+a₂t²+a₃t³+a₄t⁴+a₅t⁵": String.raw `q(t)=a_0+a_1t+a_2t^2+a_3t^3+a_4t^4+a_5t^5`,
    "q(t)=q₀+(q_f−q₀)[10τ³−15τ⁴+6τ⁵]，τ=t/T": String.raw `q(t)=q_0+(q_f-q_0)\left(10\tau^3-15\tau^4+6\tau^5\right),\qquad \tau=\frac{t}{T}`,
    "v = J(q)·q̇；q̇ = J⁺(q)·v": String.raw `\mathbf v=\mathbf J(\mathbf q)\dot{\mathbf q},\qquad \dot{\mathbf q}=\mathbf J^{+}(\mathbf q)\mathbf v`,
    "m_s z̈_s + c_s(ż_s−ż_u) + k_s(z_s−z_u) = F_a": String.raw `m_s\ddot z_s+c_s\left(\dot z_s-\dot z_u\right)+k_s\left(z_s-z_u\right)=F_a`,
    "m_u z̈_u − c_s(ż_s−ż_u) − k_s(z_s−z_u) + k_t(z_u−z_r) = −F_a": String.raw `m_u\ddot z_u-c_s\left(\dot z_s-\dot z_u\right)-k_s\left(z_s-z_u\right)+k_t\left(z_u-z_r\right)=-F_a`,
    "f_s≈(1/2π)√(k_s/m_s)；ζ_s≈c_s/(2√(k_s m_s))": String.raw `f_s\approx\frac{1}{2\pi}\sqrt{\frac{k_s}{m_s}},\qquad \zeta_s\approx\frac{c_s}{2\sqrt{k_s m_s}}`,
    "T(s)=G(s)/(1+G(s)H(s))；1+G(s)H(s)=0": String.raw `T(s)=\frac{G(s)}{1+G(s)H(s)},\qquad 1+G(s)H(s)=0`,
    "s²+2ζω_n s+ω_n²=0；M_p=e^(−πζ/√(1−ζ²))；t_s≈4/(ζω_n)": String.raw `s^2+2\zeta\omega_n s+\omega_n^2=0,\qquad M_p=e^{-\frac{\pi\zeta}{\sqrt{1-\zeta^2}}},\qquad t_s\approx\frac{4}{\zeta\omega_n}`,
    "AᵀP + PA = −Q，Q>0，P>0": String.raw `A^{\mathsf T}P+PA=-Q,\qquad Q\succ0,\;P\succ0`,
};
function standardizeFormula(formula: string) {
    if (standardizedFormulaMap[formula])
        return standardizedFormulaMap[formula];
    return formula
        .replace(/−/g, "-")
        .replace(/×/g, String.raw `\times `)
        .replace(/；/g, String.raw `,\qquad `)
        .replace(/，/g, String.raw `,\;`)
        .replace(/([A-Za-zωψζτ])_([A-Za-z0-9]+)/g, "$1_{$2}")
        .replace(/ω/g, String.raw `\omega `)
        .replace(/ψ/g, String.raw `\psi `)
        .replace(/ζ/g, String.raw `\zeta `)
        .replace(/τ/g, String.raw `\tau `)
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/⁵/g, "^5")
        .replace(/⁶/g, "^6");
}
export function MathFormula({ formula }: {
    formula: string;
}) {
    const html = katex.renderToString(standardizeFormula(formula), {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
        output: "html",
    });
    return (<div className="equation-formula" role="math" aria-label={formula} dangerouslySetInnerHTML={{ __html: html }}/>);
}
