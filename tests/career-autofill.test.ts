import assert from "node:assert/strict";
import test from "node:test";
import { buildCareerAutofillUserscript } from "../app/components/career/CareerAutofillAssistant";

test("career autofill userscript is valid and keeps submission manual", () => {
  const script = buildCareerAutofillUserscript({
    name: "测试用户",
    phone: "13800000000",
    email: "test@example.com",
    gender: "",
    birthDate: "",
    idNumber: "",
    currentCity: "上海",
    targetCity: "苏州",
    education: "本科",
    school: "测试大学",
    major: "机械工程",
    graduationDate: "2026-06",
    workYears: "0",
    politicalStatus: "",
  });

  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /atlas-autofill-button/);
  assert.match(script, /不会提交表单/);
  assert.doesNotMatch(script, /\.submit\s*\(/);
});
