/**
 * 광고(앱 빌드에서만). 웹은 비영리라 이 파일이 웹 번들에 들어가지 않는다(main.ts에서 __ADS__일 때만 불러옴).
 *
 * - 배너: 결과 화면 아래, 그리고 플레이 화면 위(넣어도 찾은 단어 줄이 보이는 화면만. SE는 빠진다).
 *   첫 판·오늘의 초성에는 없음. 플러그인은 가운데 정렬 배너 하나만 띄울 수 있어 양옆 배너는 없다.
 * - 보상형: 시간이 다 됐을 때 '광고 보고 +15초 이어하기'(한 판 1번). 오늘의 초성은 공정하게 빼고.
 * - 비맞춤 광고만 요청한다(추적 허용 팝업 없음). 유럽 등은 Google 동의 창(UMP)을 먼저 띄운다.
 * - 광고 단위 ID는 공개 저장소에 두지 않는다. 앱 빌드 때 .env.app.local에서 읽고, 없으면 Google 테스트 ID.
 * - 브라우저에서 앱 모드로 띄우면(vite --mode app) 광고 대신 자리 표시만 보여 배치를 미리 본다.
 */
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { isApp } from '@tgh/ui/app';

// Google이 공개한 iOS 테스트 광고 단위
const TEST_BANNER = 'ca-app-pub-3940256099942544/2934735716';
const TEST_REWARDED = 'ca-app-pub-3940256099942544/1712485313';

const BANNER_ID = import.meta.env.VITE_ADMOB_BANNER || TEST_BANNER;
const REWARDED_ID = import.meta.env.VITE_ADMOB_REWARDED || TEST_REWARDED;
const TESTING = BANNER_ID === TEST_BANNER;
/** 브라우저 미리보기: 광고 SDK 없이 자리만 */
const PREVIEW = !isApp;

let ready: Promise<boolean> | null = null;
let privacyOptions = false;

/** 앱 시작 때 한 번. 동의가 필요한 지역이면 동의 창을 먼저 띄운다. 광고를 못 쓰면 false. */
export function init(): Promise<boolean> {
  ready ??= (async () => {
    if (PREVIEW) return true;
    try {
      await AdMob.initialize({ initializeForTesting: TESTING });
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED)
        info = await AdMob.showConsentForm();
      // 이 enum은 패키지 밖으로 export되지 않아 문자열로 비교한다
      privacyOptions = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
      return info.canRequestAds;
    } catch {
      return false;
    }
  })();
  return ready;
}

/** 첫 화면에 '광고 개인정보 설정'을 보여야 하는지(동의 지역) */
export async function needsPrivacyOptions(): Promise<boolean> {
  await init();
  return privacyOptions;
}

export function showPrivacyOptions(): Promise<void> {
  return AdMob.showPrivacyOptionsForm().catch(() => {});
}

// ---------- 배너 ----------

export type Where = 'top' | 'bottom';
let shown: Where | null = null;
/** 위 배너와 그 아래 화면 사이 간격 */
const GAP = 10;

/** 배너 높이 어림값. 실제 높이는 SizeChanged로 맞춘다 */
export function bannerHeight(): number {
  return innerWidth >= 700 ? 90 : 50;
}

/** 배너가 차지하는 높이를 CSS 변수로 알려 화면이 그만큼 비켜 준다 */
export function setSpace(where: Where | null, height: number): void {
  const root = document.documentElement;
  root.style.setProperty('--ad-top', where === 'top' ? `${height + GAP}px` : '0px');
  root.style.setProperty('--ad-bottom', where === 'bottom' ? `${height}px` : '0px');
  root.classList.toggle('ad-top', where === 'top');
  root.classList.toggle('ad-preview', PREVIEW && where !== null);
}

/** 홈 인디케이터 영역 높이. 배너는 이만큼 내려 화면 맨 아래에 붙인다. */
function safeBottom(): number {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom)';
  document.body.append(probe);
  const v = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return Math.round(v);
}

// 자리는 배너를 띄우기 전에 어림값으로 먼저 비워 둔다. 광고가 늦게 떠도 화면이 움직이지 않게.
if (!PREVIEW)
  void AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
    if (shown && height > 0) setSpace(shown, height);
  });

export async function showBanner(where: Where): Promise<void> {
  if (!(await init())) return;
  if (shown === where) return;
  if (shown) await hideBanner();
  shown = where;
  setSpace(where, bannerHeight());
  if (PREVIEW) return;
  try {
    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: where === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
      // 플러그인은 안전 영역 아래 끝에 붙인다. 음수 여백으로 홈 인디케이터 영역까지 내린다.
      margin: where === 'bottom' ? -safeBottom() : 0,
      npa: true,
      isTesting: TESTING,
    });
  } catch {
    shown = null;
    setSpace(null, 0);
  }
}

export async function hideBanner(): Promise<void> {
  if (!shown) return;
  shown = null;
  setSpace(null, 0);
  if (!PREVIEW) await AdMob.removeBanner().catch(() => {});
}

// ---------- 보상형 ----------

/**
 * 보상형 광고 한 편. 광고가 닫힐 때까지 기다린다.
 * 끝까지 봐서 보상 신호가 왔으면 'rewarded', 중간에 닫으면 'closed', 광고가 없거나 실패하면 'none'.
 * (iOS 플러그인은 보상을 받을 때만 show 약속을 끝내므로, 닫힘은 이벤트로 기다린다.)
 */
export async function rewarded(): Promise<'rewarded' | 'closed' | 'none'> {
  if (!(await init())) return 'none';
  if (PREVIEW) return new Promise((r) => setTimeout(() => r('rewarded'), 800));
  let got = false;
  let finish: (r: 'closed' | 'none') => void = () => {};
  const done = new Promise<'closed' | 'none'>((r) => (finish = r));
  const handles = await Promise.all([
    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (got = true)),
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish('closed')),
    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish('none')),
  ]);
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID, npa: true, isTesting: TESTING });
    AdMob.showRewardVideoAd().then(
      () => (got = true),
      () => finish('none'),
    );
    const end = await done;
    return got ? 'rewarded' : end;
  } catch {
    return 'none';
  } finally {
    for (const h of handles) void h.remove();
  }
}
