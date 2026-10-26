import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCareerAutofillUserscript,
  parseCareerAutofillProfile,
} from "../app/features/career/components/CareerAutofillAssistant";

test("career autofill userscript is valid and keeps submission manual", () => {
  const profile = parseCareerAutofillProfile(`
姓名：测试用户
手机号：13800000000
邮箱：test@example.com
现居城市：上海
意向城市：苏州
学历：本科
学校：测试大学
专业：机械工程
毕业时间：2026年6月
推荐方式：无
招聘信息来源：招聘公众号
是否服从调配：是
是否接受全球派遣：接受
项目名称：测试项目
获奖名称：测试奖项
  `);
  const script = buildCareerAutofillUserscript(profile);

  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /atlas-autofill-button/);
  assert.match(script, /不会上传附件或提交表单/);
  assert.match(script, /recruitmentSource/);
  assert.match(script, /acceptGlobalAssignment/);
  assert.match(script, /projectDescription/);
  assert.match(script, /awardDescription/);
  assert.match(script, /data-form-field-i18n-name/);
  assert.doesNotMatch(script, /\.submit\s*\(/);
  assert.doesNotMatch(script, /input\[type=['"]checkbox/);
});

test("career autofill profile recognizes common campus application fields", () => {
  const profile = parseCareerAutofillProfile(`
姓名：张三
手机号：13900000000
邮箱：zhangsan@example.com
推荐方式：内推
内推码：ABC123
招聘信息来源：学校就业群
是否服从调配：是
是否接受全球派遣：不接受
学校名称：示例大学
学历：硕士
专业：机械工程
入学时间：2024年9月
毕业时间：2027年6月
学历类型：统招全日制
成绩排名：前 5%
公司名称：示例科技有限公司
职位名称：结构实习生
实习开始时间：2025年7月
实习结束时间：2025年12月
项目名称：机器人结构优化
项目角色：项目负责人
项目开始时间：2025年1月
项目结束时间：2025年6月
获奖名称：全国二等奖
获奖时间：2025
作品名称：机械设计作品集
作品链接：https://example.com/portfolio
  `);

  assert.equal(profile.recommendationType, "内推");
  assert.equal(profile.referralCode, "ABC123");
  assert.equal(profile.educationStartDate, "2024-09");
  assert.equal(profile.graduationDate, "2027-06");
  assert.equal(profile.companyName, "示例科技有限公司");
  assert.equal(profile.projectName, "机器人结构优化");
  assert.equal(profile.awardName, "全国二等奖");
  assert.equal(profile.workUrl, "https://example.com/portfolio");
});
