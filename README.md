# 乡忆 ScentHome

基于你提供的 `Scenthome.txt` 和 `UI` 定稿实现的完整网站原型，技术栈为：

- 前端：Next.js + TypeScript + Tailwind，适合部署到 Vercel
- 后端：Supabase Auth + Database + Storage
- 当前 AI 生成：图片识别使用 GLM-4.6V-Flash，香气方案生成使用 MiniMax

## 已实现的功能

- 首页完整流程：记忆输入、图片上传、情绪标签、AI 生成中、结果展示、体验模块、反馈模块
- 登录页：Supabase 邮箱注册 / 登录
- 购买页：订单摘要、收货信息、付款表单、订单写入 Supabase
- 访客结账：不登录也能直接购买，系统会要求填写邮箱作为联系凭证
- 保存方案：只有在你选择保存到账户时，才需要登录 / 注册
- 访客试用：只生成和体验时，内容默认留在前端 session，不会额外写数据库
- Supabase 数据落库：
  - `scent_profiles`
  - `profile_feedback`
  - `orders`
  - `memory-images` Storage bucket

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 复制环境变量文件

```bash
cp .env.example .env.local
```

3. 在 Supabase 项目中找到以下值，并准备你的 MiniMax 与 GLM API key，一起填入 `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
MINIMAX_API_KEY=你的 MiniMax API key
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2.5
GLM_API_KEY=你的 GLM API key
GLM_MODEL=glm-4.6v-flash
```

4. 在 Supabase SQL Editor 中执行 [supabase/schema.sql](/Users/shi/projects/Scenthome/supabase/schema.sql)

如果你的数据库是更早版本、已经建过表了，再额外执行一次 [supabase/guest-checkout-migration.sql](/Users/shi/projects/Scenthome/supabase/guest-checkout-migration.sql)，这样访客下单才能正常工作。

5. 启动项目

```bash
npm run dev
```

6. 浏览器打开 `http://localhost:3000`

## 部署到 Vercel

1. 把这个项目上传到 GitHub
2. 在 Vercel 里导入该仓库
3. 在 Vercel 项目环境变量中填写：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `MINIMAX_API_KEY`
   - `MINIMAX_BASE_URL`
   - `MINIMAX_MODEL`
   - `GLM_API_KEY`
   - `GLM_MODEL`
4. 重新部署

## 你作为编程小白最需要知道的

- 如果你还没配 Supabase，页面也能看和走流程，但登录、保存、订单不会正式落库
- 如果你还没配 `MINIMAX_API_KEY`，“生成专属方案”会明确报错提醒你去配置
- 如果你还没配 `GLM_API_KEY`，上传图片时会回退到 MiniMax 直接参考图片线索的模式
- 当前支付页是 MVP 版本，不会真的扣款，只会把订单记录到 Supabase
- 现在支持访客下单：不登录也可以购买，但需要填写邮箱作为订单联系凭证
- 现在支持“先试用、后决定”：只要不点保存，生成结果就尽量保留在前端 session，不会额外占用数据库
- 如果后面你要接真实支付，我建议下一步升级 Stripe
- 现在“生成专属方案”已经是实际 AI 生成，不再是本地规则假数据
- 图片识别优先走 GLM-4.6V-Flash，识别结果再交给 MiniMax 组织成最终香气方案

## 目录说明

- [app](/Users/shi/projects/Scenthome/app)：页面和 API 路由
- [components](/Users/shi/projects/Scenthome/components)：页面组件
- [lib](/Users/shi/projects/Scenthome/lib)：类型、Supabase 客户端、草稿缓存、气味生成逻辑
- [supabase/schema.sql](/Users/shi/projects/Scenthome/supabase/schema.sql)：数据库和 Storage 初始化脚本

## 当前的合理假设

- 你要的是一个可上线的 MVP，而不是已经接入真实支付网关的商业正式版
- 你强调“不要改 UI 定稿”，所以我保留了定稿的整体视觉风格、版式和氛围，只把它转成了可交互代码
- AI 方案生成现在依赖 `MINIMAX_API_KEY`；如果没填这个值，页面会明确提示而不是静默失败
