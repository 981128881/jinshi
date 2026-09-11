<script>
	import { trySilentLoginOnLaunch } from './utils/auth.js'

	export default {
		onLaunch() {
			trySilentLoginOnLaunch()
		}
	}
</script>

<style lang="scss">
	/* 注意要写在第一行 */
	@import '@/uni_modules/uview-plus/index.scss';

page {
	/* 主色：抹茶绿 */
	--color-primary: #88A87B;
	--color-primary-dark: #6F8F63;
	--color-primary-light: #B5C9AB;
	--color-primary-soft: #E8EFE4;
	--color-primary-bg: rgba(136, 168, 123, 0.14);
	/* 图标色阶 */
	--color-icon-main: #7E8C7B;       /* 主图标-未选中 */
	--color-icon-active: #88A87B;     /* 主图标-选中 */
	--color-icon-base: #8B8B8B;       /* 通用图标-基础 */
	--color-icon-accent: #F39C12;     /* 强调操作图标 */
	--color-icon-muted: #B5A89A;      /* 弱化/辅助图标 */
	/* 强调：橙色（价格、角标等小面积点睛） */
	--color-accent: #F39C12;
	--color-danger: #E11D48;
	--color-danger-bg: #FFF1F2;
	--color-success: #88A87B;
	--color-warning: #F39C12;
	--color-price: #F39C12;
	--color-price-dark: #D68910;
	/* 中性：宣纸白 + 深灰文字 */
	--color-bg: #F5F4F0;
	--color-card: #ffffff;
	--color-text: #4A4A4A;
	--color-text-secondary: #8B8B8B;
	--color-text-muted: #B5A89A;
	--color-border: #E8E6E0;
	--color-surface: #EFEEE9;
	--color-bar: #3D4A38;
	--radius-sm: 8rpx;
	--radius-md: 16rpx;
	--radius-lg: 24rpx;
	background-color: var(--color-bg);
	font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue',
		'PingFang SC', 'Microsoft Yahei', sans-serif;
	color: var(--color-text);
}
</style>
