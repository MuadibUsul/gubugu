import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '隐私政策',
  description: '谷布谷图鉴的数据收集、使用、保存和删除说明。',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-10 pb-24 sm:px-8">
      <p className="section-kicker">最后更新：2026-09-05</p>
      <h1 className="mt-3 text-4xl">隐私政策</h1>
      <div className="prose prose-sm mt-8 max-w-none space-y-7 leading-7 text-[var(--ink-2)]">
        <section>
          <h2 className="text-xl text-[var(--ink)]">我们处理的数据</h2>
          <p>
            注册时处理邮箱、展示名、用户名和密码哈希；使用过程中处理收藏状态、评分、评论、换谷记录、私信、关注关系以及你主动拍摄或上传的图片。
          </p>
        </section>
        <section>
          <h2 className="text-xl text-[var(--ink)]">相机与照片</h2>
          <p>
            相机仅在你进入扫描页并授权后启用。扫描图用于候选匹配、点亮确认和识别审计；未鉴定扫描图为私密资产，不出现在公开主页。社区图片在审核通过后才公开展示。
          </p>
        </section>
        <section>
          <h2 className="text-xl text-[var(--ink)]">公开范围</h2>
          <p>
            公开主页只展示符合资料可见性设置的已点亮官方
            SKU、已审核内容和公开换谷信息。愿望、未点亮收藏、未鉴定扫描和私信不会作为公开收藏展示。
          </p>
        </section>
        <section>
          <h2 className="text-xl text-[var(--ink)]">保存与安全</h2>
          <p>
            数据保存在自托管 PostgreSQL 和 VPS 资产目录中。登录 Cookie 使用
            HttpOnly、SameSite 限制，并在生产 HTTPS 环境启用
            Secure。我们不会出售个人数据。
          </p>
        </section>
        <section>
          <h2 className="text-xl text-[var(--ink)]">删除账号</h2>
          <p>
            你可以在“我 → 编辑资料 → 删除账号”永久删除账号，也可以访问
            <Link
              className="mx-1 text-[var(--shu)] underline"
              href="/account-deletion"
            >
              账号删除说明
            </Link>
            。删除会清理凭据、个人内容、互动记录和无人继续引用的私密扫描文件，无法恢复。
          </p>
        </section>
        <section>
          <h2 className="text-xl text-[var(--ink)]">联系我们</h2>
          <p>
            正式发布前需要由运营方补充有效的隐私联系邮箱和主体信息；在这些信息补齐前，本政策仅用于测试环境。
          </p>
        </section>
      </div>
    </main>
  );
}
