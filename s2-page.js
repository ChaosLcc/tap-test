/**
 * S2 设备与浏览器兼容性测试页脚本（任务 2.1；设计 7.5、7.6、15.2、19.3、20.1；需求 9.7、22.1、22.3、26.3、37.1、37.2）。
 *
 * 纯静态脚本，不依赖任何前端框架或第三方库，不包含业务接口、真实凭据或任何密钥。
 * 同时支持浏览器直接加载与 Node.js 自动化测试导入。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.S2TestPage = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var FIXED_TEST_URLS = {
    repoUrl: 'https://github.com/ChaosLcc/tap-test.git',
    pagesPlainUrl: 'https://chaoslcc.github.io/tap-test/',
    pagesQueryUrl: 'https://chaoslcc.github.io/tap-test/?q=1',
    telUri: 'tel:4000000000',
    amapMarkerUri:
      'https://uri.amap.com/marker?position=117.120098,36.651200&name=%E6%BB%B4%E5%92%92%E7%A2%B0%E7%A2%B0%E6%B5%8B%E8%AF%95%E9%97%A8%E5%BA%97&src=tap-test&coordinate=gaode&callnative=1',
    amapSearchUri:
      'https://uri.amap.com/search?keyword=%E6%B5%8E%E5%8D%97%E5%8E%86%E4%B8%8B%E5%8C%BA%E6%B5%8B%E8%AF%95%E9%97%A8%E5%BA%97&view=map&src=tap-test&callnative=1',
  };

  var PLATFORM_CATALOG_DRAFT = [
    {
      code: 'douyin',
      name: '抖音',
      domains: ['douyin.com', 'iesdouyin.com'],
      appOpenUrl: 'snssdk1128://',
    },
    {
      code: 'kuaishou',
      name: '快手',
      domains: ['kuaishou.com'],
      appOpenUrl: '',
    },
    {
      code: 'xiaohongshu',
      name: '小红书',
      domains: ['xiaohongshu.com', 'xhslink.com'],
      appOpenUrl: '',
    },
    {
      code: 'meituan',
      name: '美团',
      domains: ['meituan.com'],
      appOpenUrl: '',
    },
    {
      code: 'dianping',
      name: '大众点评',
      domains: ['dianping.com', 'dpurl.cn'],
      appOpenUrl: '',
    },
    {
      code: 'amap',
      name: '高德',
      domains: ['amap.com'],
      appOpenUrl: '',
    },
    {
      code: 'ctrip',
      name: '携程',
      domains: ['ctrip.com'],
      appOpenUrl: '',
    },
    {
      code: 'baidu',
      name: '百度',
      domains: ['baidu.com'],
      appOpenUrl: '',
    },
    {
      code: 'wecom',
      name: '企业微信',
      domains: ['work.weixin.qq.com'],
      appOpenUrl: '',
    },
    {
      code: 'wechat',
      name: '微信',
      domains: [],
      appOpenUrl: 'weixin://',
    },
  ];

  var WECHAT_QR_PREFIXES = [
    {
      type: 'wechat_personal',
      label: '个人微信二维码',
      featureItem: 'private.friend',
      prefix: 'https://u.wechat.com/',
    },
    {
      type: 'wecom_contact_or_group',
      label: '企业微信“联系我”或客户群二维码',
      featureItem: 'private.friend / private.group',
      prefix: 'https://work.weixin.qq.com/',
    },
    {
      type: 'wechat_group',
      label: '个人微信群二维码',
      featureItem: 'private.group',
      prefix: 'https://weixin.qq.com/g/',
    },
    {
      type: 'official_account',
      label: '公众号二维码',
      featureItem: 'follow.official_account',
      prefix: 'http://weixin.qq.com/r/',
    },
    {
      type: 'channels',
      label: '视频号二维码',
      featureItem: 'follow.channels',
      prefix: 'https://weixin.qq.com/sph/',
    },
  ];

  /**
   * 识别当前访问地址属于无参数固定地址还是带 ?q=1 固定地址（需求 37.2；设计 20.1）。
   */
  function detectEntryMode(searchString, hrefString) {
    var search = typeof searchString === 'string' ? searchString.trim() : '';
    var href = typeof hrefString === 'string' ? hrefString : FIXED_TEST_URLS.pagesPlainUrl;
    if (!search || search === '?') {
      return {
        mode: 'plain',
        search: '（无参数）',
        href: href,
        label: '固定无参数地址（不带查询参数）',
      };
    }
    var raw = search.charAt(0) === '?' ? search.slice(1) : search;
    var parts = raw.split('&');
    var qVal = null;
    try {
      for (var i = 0; i < parts.length; i += 1) {
        var kv = parts[i].split('=');
        if (decodeURIComponent(kv[0] || '') === 'q') {
          qVal = decodeURIComponent(kv.slice(1).join('=') || '');
          break;
        }
      }
    } catch (_e) {
      return {
        mode: 'invalid',
        search: search.charAt(0) === '?' ? search : '?' + search,
        href: href,
        label: '查询参数编码无效：' + search,
      };
    }
    if (qVal === '1' && parts.length === 1) {
      return {
        mode: 'q1',
        search: '?q=1',
        href: href,
        label: '固定带 ?q=1 参数地址（NFC 标签测试地址 q=1）',
      };
    }
    return {
      mode: 'custom',
      search: search.charAt(0) === '?' ? search : '?' + search,
      href: href,
      label: '带自定义查询参数地址 (' + (search.charAt(0) === '?' ? search : '?' + search) + ')',
    };
  }

  /**
   * 解析 User-Agent，识别 iOS/Android 运行环境、宿主浏览器/App 内置浏览器、浏览器内核及版本（需求 22.1、37.1）。
   */
  function parseS2Environment(uaString) {
    var ua = typeof uaString === 'string' ? uaString : '';
    var os = 'other';
    var osVersion = null;
    var osMajor = null;
    var osLabel = '其他运行环境';

    var iosMatch = ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+(?:[_.]\d+)*)/i);
    var androidMatch = ua.match(/Android\s+(\d+(?:\.\d+)*)/i);
    var harmonyMatch = ua.match(/HarmonyOS\s*(\d+(?:\.\d+)*)?/i);

    if (iosMatch || /iPhone|iPad|iPod/i.test(ua)) {
      os = 'ios';
      if (iosMatch) {
        osVersion = iosMatch[1].replace(/_/g, '.');
        osMajor = parseInt(osVersion.split('.')[0], 10);
        osLabel = 'iOS ' + osVersion;
      } else {
        osLabel = 'iOS（版本未标注）';
      }
    } else if (androidMatch || /Android/i.test(ua)) {
      os = 'android';
      if (androidMatch) {
        osVersion = androidMatch[1];
        osMajor = parseInt(androidMatch[1].split('.')[0], 10);
        osLabel = 'Android ' + osVersion + (harmonyMatch ? ' (HarmonyOS)' : '');
      } else {
        osLabel = 'Android' + (harmonyMatch ? ' (HarmonyOS)' : '');
      }
    } else if (harmonyMatch) {
      os = 'android';
      osVersion = harmonyMatch[1] || null;
      osLabel = 'HarmonyOS' + (osVersion ? ' ' + osVersion : '');
    }

    var hostKey = 'browser';
    var hostLabel = '系统默认浏览器';
    var isInAppBrowser = false;
    var blocksAppSchemes = false;

    if (/wxwork/i.test(ua)) {
      hostKey = 'wecom';
      hostLabel = '企业微信内置浏览器 (wxwork)';
      isInAppBrowser = true;
      blocksAppSchemes = true;
    } else if (/MicroMessenger/i.test(ua)) {
      hostKey = 'wechat';
      hostLabel = '微信内置浏览器 (MicroMessenger)';
      isInAppBrowser = true;
      blocksAppSchemes = true;
    } else if (/\bQQ\/[\d.]+/i.test(ua)) {
      hostKey = 'qq';
      hostLabel = 'QQ 内置浏览器 (QQ)';
      isInAppBrowser = true;
      blocksAppSchemes = true;
    } else if (/aweme|BytedanceWebview|musical_ly/i.test(ua)) {
      hostKey = 'douyin';
      hostLabel = '抖音内置浏览器 (aweme)';
      isInAppBrowser = true;
      blocksAppSchemes = true;
    } else if (/Kwai|kuaishou/i.test(ua)) {
      hostKey = 'kuaishou';
      hostLabel = '快手内置浏览器 (Kwai)';
      isInAppBrowser = true;
      blocksAppSchemes = true;
    } else if (/xhsdiscover|xiaohongshu/i.test(ua)) {
      hostKey = 'xiaohongshu';
      hostLabel = '小红书内置浏览器 (xhsdiscover)';
      isInAppBrowser = true;
      blocksAppSchemes = true;
    } else if (/AliApp|AlipayClient/i.test(ua)) {
      hostKey = 'alipay';
      hostLabel = '支付宝内置浏览器 (AlipayClient)';
      isInAppBrowser = true;
      blocksAppSchemes = false;
    } else if (/HuaweiBrowser|HBPC/i.test(ua)) {
      hostKey = 'huawei_browser';
      hostLabel = '华为自带浏览器 (HuaweiBrowser)';
    } else if (/MiuiBrowser|XiaoMi/i.test(ua)) {
      hostKey = 'xiaomi_browser';
      hostLabel = '小米自带浏览器 (MiuiBrowser)';
    } else if (/HeyTapBrowser|OppoBrowser/i.test(ua)) {
      hostKey = 'oppo_browser';
      hostLabel = 'OPPO 自带浏览器 (HeyTapBrowser)';
    } else if (/VivoBrowser/i.test(ua)) {
      hostKey = 'vivo_browser';
      hostLabel = 'vivo 自带浏览器 (VivoBrowser)';
    } else if (/HonorBrowser/i.test(ua)) {
      hostKey = 'honor_browser';
      hostLabel = '荣耀自带浏览器 (HonorBrowser)';
    } else if (/SamsungBrowser/i.test(ua)) {
      hostKey = 'samsung_browser';
      hostLabel = '三星浏览器 (Samsung Internet)';
    } else if (/MQQBrowser/i.test(ua)) {
      hostKey = 'qq_browser';
      hostLabel = 'QQ 浏览器 (MQQBrowser)';
    } else if (/UCBrowser/i.test(ua)) {
      hostKey = 'uc_browser';
      hostLabel = 'UC 浏览器 (UCBrowser)';
    } else if (/CriOS\//i.test(ua)) {
      hostKey = 'chrome_ios';
      hostLabel = 'iOS Chrome';
    } else if (/FxiOS\//i.test(ua)) {
      hostKey = 'firefox_ios';
      hostLabel = 'iOS Firefox';
    } else if (os === 'ios' && /Safari\//i.test(ua)) {
      hostKey = 'safari';
      hostLabel = 'iOS Safari 系统浏览器';
    } else if (/Chrome\//i.test(ua)) {
      hostKey = 'chrome';
      hostLabel = 'Chrome / Chromium 系统浏览器';
    }

    var engineName = 'Unknown';
    var engineVersion = '未知版本';
    var engineMajor = null;
    var engineLabel = '未识别内核';

    var chromeMatch = ua.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+)*)/i);
    var webkitMatch = ua.match(/AppleWebKit\/(\d+(?:\.\d+)*)/i);
    var safariVerMatch = ua.match(/Version\/(\d+(?:\.\d+)*)/i);
    var firefoxMatch = ua.match(/(?:Firefox|FxiOS)\/(\d+(?:\.\d+)*)/i);

    if (os === 'ios' && webkitMatch) {
      engineName = 'WebKit';
      engineVersion = webkitMatch[1];
      engineMajor = osMajor || (safariVerMatch ? parseInt(safariVerMatch[1].split('.')[0], 10) : null);
      engineLabel =
        'WebKit (AppleWebKit/' +
        webkitMatch[1] +
        (safariVerMatch ? ', Safari Version/' + safariVerMatch[1] : '') +
        ')';
    } else if (chromeMatch) {
      engineName = 'Blink';
      engineVersion = chromeMatch[1];
      engineMajor = parseInt(chromeMatch[1].split('.')[0], 10);
      engineLabel =
        'Blink / Chromium ' +
        chromeMatch[1] +
        (webkitMatch ? ' (AppleWebKit/' + webkitMatch[1] + ')' : '');
    } else if (webkitMatch) {
      engineName = 'WebKit';
      engineVersion = webkitMatch[1];
      engineMajor = safariVerMatch ? parseInt(safariVerMatch[1].split('.')[0], 10) : null;
      engineLabel = 'WebKit (AppleWebKit/' + webkitMatch[1] + ')';
    } else if (firefoxMatch) {
      engineName = 'Gecko';
      engineVersion = firefoxMatch[1];
      engineMajor = parseInt(firefoxMatch[1].split('.')[0], 10);
      engineLabel = 'Gecko / Firefox ' + firefoxMatch[1];
    }

    var needsLegacyPlugin = false;
    var legacyCheckText = '满足当前构建目标（es2020 / safari15 / chrome87），无需启用 @vitejs/plugin-legacy';
    if (os === 'ios' && osMajor !== null && osMajor < 15) {
      needsLegacyPlugin = true;
      legacyCheckText =
        '当前 iOS 主版本 (' + osMajor + ') 低于 iOS 15 构建目标，需评估启用 @vitejs/plugin-legacy';
    } else if (engineName === 'Blink' && engineMajor !== null && engineMajor < 87) {
      needsLegacyPlugin = true;
      legacyCheckText =
        '当前 Chromium 内核主版本 (' +
        engineMajor +
        ') 低于 chrome87 构建目标，需评估启用 @vitejs/plugin-legacy';
    } else if (engineName === 'Unknown') {
      legacyCheckText = '未识别到明确内核主版本，待真机实测核对是否满足 safari15 / chrome87';
    }

    var schemePolicyText = blocksAppSchemes
      ? '需引导到系统浏览器：当前处于受限内置浏览器，点击唤起外部 App 按钮时应显示“在浏览器中打开”图文引导（需求 22.2）'
      : '可直接尝试唤起外部 App：当前为系统浏览器或允许 Scheme 唤起的容器，若 3 秒后仍在前台则展示“没有打开？”备选入口（需求 22.3）';

    return {
      ua: ua,
      os: os,
      osVersion: osVersion,
      osMajor: osMajor,
      osLabel: osLabel,
      hostKey: hostKey,
      hostLabel: hostLabel,
      isInAppBrowser: isInAppBrowser,
      blocksAppSchemes: blocksAppSchemes,
      schemePolicyText: schemePolicyText,
      engineName: engineName,
      engineVersion: engineVersion,
      engineMajor: engineMajor,
      engineLabel: engineLabel,
      needsLegacyPlugin: needsLegacyPlugin,
      legacyCheckText: legacyCheckText,
    };
  }

  /**
   * 生成按当前环境区分的保存视频降级说明（需求 22.4、26.3）。
   */
  function getVideoSaveFallbackGuide(env) {
    var currentEnv = env || { os: 'other', blocksAppSchemes: false, hostLabel: '当前浏览器' };
    if (currentEnv.blocksAppSchemes) {
      return (
        '当前处于 ' +
        currentEnv.hostLabel +
        '，不支持直接通过系统分享面板保存视频：请点击右上角选择“在系统浏览器中打开”，再使用系统分享面板或直接下载保存视频；图片可直接长按保存。'
      );
    }
    if (currentEnv.os === 'ios') {
      return 'iOS 降级说明：当前环境不支持 navigator.canShare({ files })，请点击“直接下载测试视频”或在 Safari 中打开视频后通过系统菜单选择“存储视频 / 存储到‘文件’”。';
    }
    if (currentEnv.os === 'android') {
      return 'Android 降级说明：当前环境不支持 navigator.canShare({ files })，请点击“直接下载测试视频”触发浏览器下载保存到本地相册或下载目录。';
    }
    return '降级说明：当前浏览器不支持 navigator.canShare({ files }) 文件分享面板，请点击“直接下载测试视频”或长按视频另存到本地。';
  }

  /**
   * 检测当前环境是否支持 navigator.canShare({ files }) 保存视频（需求 26.3）。
   */
  function detectCanShareVideoSupport(nav, env, FileCtor) {
    var fallbackGuide = getVideoSaveFallbackGuide(env);
    var F = FileCtor || (typeof File !== 'undefined' ? File : null);
    if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function' || !F) {
      return {
        supported: false,
        statusText: '不支持（当前环境缺少 navigator.canShare 或 File API）',
        fallbackGuide: fallbackGuide,
      };
    }
    try {
      var probeFile = new F([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], 'probe.mp4', {
        type: 'video/mp4',
      });
      var canShareFiles = Boolean(nav.canShare({ files: [probeFile] }));
      if (canShareFiles) {
        return {
          supported: true,
          statusText: '支持 navigator.canShare({ files }) 系统分享面板保存视频',
          fallbackGuide: fallbackGuide,
        };
      }
      return {
        supported: false,
        statusText: '不支持（navigator.canShare({ files }) 返回 false）',
        fallbackGuide: fallbackGuide,
      };
    } catch (err) {
      return {
        supported: false,
        statusText: '不支持（调用 navigator.canShare 抛错：' + String(err && err.message ? err.message : err) + '）',
        fallbackGuide: fallbackGuide,
      };
    }
  }

  /**
   * 复制文本测试：优先调用 navigator.clipboard.writeText，失败时回退 document.execCommand('copy')，
   * 仍失败时选中文本框提示手动复制（设计 15.2）。
   */
  function copyTextWithFallback(text, options) {
    var opts = options || {};
    var nav = opts.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    var doc = opts.document || (typeof document !== 'undefined' ? document : null);
    var inputEl = opts.inputElement || null;
    var value = typeof text === 'string' ? text : '';

    function tryExecCommandFallback() {
      if (doc && typeof doc.execCommand === 'function') {
        try {
          var tempArea = doc.createElement ? doc.createElement('textarea') : null;
          if (tempArea && doc.body && doc.body.appendChild) {
            tempArea.value = value;
            tempArea.setAttribute('readonly', 'readonly');
            doc.body.appendChild(tempArea);
            if (typeof tempArea.select === 'function') {
              tempArea.select();
            }
            var copied = Boolean(doc.execCommand('copy'));
            if (doc.body.removeChild) {
              doc.body.removeChild(tempArea);
            }
            if (copied) {
              return {
                ok: true,
                method: 'execCommand',
                message: '复制成功（通过 document.execCommand("copy") 降级分支，共 ' + value.length + ' 字符）',
              };
            }
          }
        } catch (_e) {
          // 继续走手动选中回退
        }
      }
      if (inputEl && typeof inputEl.select === 'function') {
        try {
          inputEl.focus && inputEl.focus();
          inputEl.select();
        } catch (_e2) {
          // 忽略选中异常
        }
      }
      return {
        ok: false,
        method: 'manual',
        message: '自动复制不可用，已为您选中文本框文字，请长按手动选择“复制”',
      };
    }

    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      try {
        var promise = nav.clipboard.writeText(value);
        if (promise && typeof promise.then === 'function') {
          return promise.then(
            function () {
              return {
                ok: true,
                method: 'clipboard',
                message: '复制成功（通过 navigator.clipboard.writeText，共 ' + value.length + ' 字符）',
              };
            },
            function () {
              return tryExecCommandFallback();
            },
          );
        }
        return Promise.resolve({
          ok: true,
          method: 'clipboard',
          message: '复制成功（通过 navigator.clipboard.writeText，共 ' + value.length + ' 字符）',
        });
      } catch (_err) {
        return Promise.resolve(tryExecCommandFallback());
      }
    }
    return Promise.resolve(tryExecCommandFallback());
  }

  /**
   * 测试 navigator.canShare 保存视频及不支持时的降级提示（需求 26.3）。
   */
  function testCanShareVideo(options) {
    var opts = options || {};
    var nav = opts.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    var env = opts.env || parseS2Environment(nav && nav.userAgent ? nav.userAgent : '');
    var FileCtor = opts.File || (typeof File !== 'undefined' ? File : null);
    var check = detectCanShareVideoSupport(nav, env, FileCtor);

    if (!check.supported) {
      return Promise.resolve({
        ok: false,
        supported: false,
        method: 'fallback',
        message: check.statusText + '。' + check.fallbackGuide,
      });
    }

    function shareFile(videoFile) {
      try {
        if (!nav.canShare({ files: [videoFile] })) {
          return Promise.resolve({
            ok: false,
            supported: false,
            method: 'fallback',
            message: 'navigator.canShare 不接受实际测试视频文件。' + check.fallbackGuide,
          });
        }
        var sharePromise = nav.share({
          files: [videoFile],
          title: 'S2 视频保存测试',
          text: '请在系统分享面板中选择存储视频',
        });
        return Promise.resolve(sharePromise).then(
          function () {
            return {
              ok: true,
              supported: true,
              method: 'canShare',
              message: '已用同源 sample.mp4 调起系统分享面板，请选择“存储视频”，再手动确认文件是否保存',
            };
          },
          function () {
            return {
              ok: false,
              supported: true,
              method: 'fallback',
              message: '系统分享面板未完成或已取消。' + check.fallbackGuide,
            };
          },
        );
      } catch (_e) {
        return Promise.resolve({
          ok: false,
          supported: false,
          method: 'fallback',
          message: '当前环境无法分享测试视频文件。' + check.fallbackGuide,
        });
      }
    }

    if (opts.videoFile) {
      return shareFile(opts.videoFile);
    }

    var fetchFn = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    if (!fetchFn) {
      return Promise.resolve({
        ok: false,
        supported: false,
        method: 'fallback',
        message: '当前环境无法读取同源测试视频。' + check.fallbackGuide,
      });
    }

    return Promise.resolve()
      .then(function () {
        return fetchFn(opts.videoUrl || './sample.mp4', { cache: 'no-store' });
      })
      .then(function (response) {
        if (!response || !response.ok) {
          throw new Error('测试视频读取失败');
        }
        return response.blob();
      })
      .then(function (videoBlob) {
        var videoFile = new FileCtor([videoBlob], 'tap-test-sample.mp4', { type: 'video/mp4' });
        return shareFile(videoFile);
      }, function () {
        return {
          ok: false,
          supported: false,
          method: 'fallback',
          message: '测试视频读取失败。' + check.fallbackGuide,
        };
      });
  }

  /**
   * 尝试唤起外部 App，并在 3 秒后检查 document.visibilityState === 'visible'（需求 22.2、22.3；设计 15.2）。
   */
  function triggerAppLaunch(options) {
    var opts = options || {};
    var scheme = opts.scheme || 'snssdk1128://';
    var platform = opts.platform || '外部 App';
    var fallbackHttps = opts.fallbackHttps || '';
    var env = opts.env || { blocksAppSchemes: false, hostLabel: '当前浏览器' };
    var doc = opts.document || (typeof document !== 'undefined' ? document : { visibilityState: 'visible' });
    var setTimer = opts.setTimeout || (typeof setTimeout !== 'undefined' ? setTimeout : null);
    var navigate =
      opts.navigate ||
      function (targetUrl) {
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = targetUrl;
        }
      };
    var onResult = typeof opts.onResult === 'function' ? opts.onResult : function () {};

    var guideShown = Boolean(env.blocksAppSchemes);
    if (!env.blocksAppSchemes || opts.forceLaunch) {
      navigate(scheme);
    }

    var initialResult = {
      platform: platform,
      scheme: scheme,
      fallbackHttps: fallbackHttps,
      blockedByHost: guideShown,
      checkedAfter3s: false,
      stillInForeground: doc.visibilityState === 'visible',
      message: guideShown
        ? '当前处于受限内置浏览器（' +
          env.hostLabel +
          '），已展示“在系统浏览器中打开”引导，并等待 3 秒检查页面是否仍在前台...'
        : '已尝试唤起 ' + platform + ' (' + scheme + ')，正在等待 3 秒检查页面是否仍在前台...',
    };

    if (!setTimer) {
      return initialResult;
    }

    setTimer(function () {
      var visible = doc.visibilityState === 'visible' && !doc.hidden;
      var msg;
      if (visible) {
        msg =
          '3 秒后页面仍在前台（visibilityState=visible）：没有打开 ' +
          platform +
          '？请检查是否已安装该 App、是否在系统浏览器中打开，或改用降级方案' +
          (fallbackHttps ? '（企业微信可回退打开 HTTPS 获客链接：' + fallbackHttps + '）' : '。');
      } else {
        msg =
          '3 秒内页面已切出前台（visibilityState=' +
          String(doc.visibilityState) +
          '）。请切回后确认 ' +
          platform +
          ' 或系统确认框是否实际出现。';
      }
      onResult({
        platform: platform,
        scheme: scheme,
        fallbackHttps: fallbackHttps,
        blockedByHost: guideShown,
        checkedAfter3s: true,
        stillInForeground: visible,
        message: msg,
      });
    }, 3000);

    return initialResult;
  }

  /**
   * 核对输入的分享链接域名或微信二维码解码内容前缀（需求 9.3、9.7；设计 7.6）。
   */
  function checkCatalogInput(rawInput) {
    var input = typeof rawInput === 'string' ? rawInput : '';
    if (!input) {
      return {
        matched: false,
        category: 'empty',
        message: '请输入要核对的平台分享链接、App 唤起地址或二维码解码文本',
      };
    }

    if (/[\s\u0000-\u001f\u007f-\u009f\\]/.test(input)) {
      return {
        matched: false,
        category: 'invalid',
        message: '地址包含空白、控制字符或反斜线，不符合设计第 7.6 节校验规则',
      };
    }

    if (input === 'snssdk1128://' || input === 'weixin://') {
      return {
        matched: true,
        category: 'app_open_url',
        code: input === 'snssdk1128://' ? 'douyin' : 'wechat',
        message: '匹配平台目录允许的 app_open_url：' + input,
      };
    }

    var urlObj;
    try {
      urlObj = new URL(input);
    } catch (_e) {
      return {
        matched: false,
        category: 'invalid_url',
        message: '不是有效的 URL 或已登记的二维码前缀：' + input,
      };
    }

    if (urlObj.username || urlObj.password || urlObj.port) {
      return {
        matched: false,
        category: 'url_parts',
        message: '地址不允许包含用户名密码段或非默认端口',
      };
    }

    var authorityMatch = input.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i);
    var authority = authorityMatch ? authorityMatch[1] : '';
    var rawHost = authority.slice(authority.lastIndexOf('@') + 1);
    if (urlObj.protocol === 'https:' && rawHost.slice(-4) === ':443') {
      rawHost = rawHost.slice(0, -4);
    } else if (urlObj.protocol === 'http:' && rawHost.slice(-3) === ':80') {
      rawHost = rawHost.slice(0, -3);
    }

    var host = (urlObj.hostname || '').toLowerCase();
    if (
      !host ||
      rawHost !== host ||
      /[^a-z0-9.-]/.test(host) ||
      host.indexOf('..') !== -1 ||
      /^\d+(\.\d+){3}$/.test(host) ||
      host.split('.').some(function (label) {
        return label.indexOf('xn--') === 0 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
      })
    ) {
      return {
        matched: false,
        category: 'hostname',
        message: '主机名不合法（仅允许小写 ASCII 域名，拒绝 IP、IDN、百分号编码和特殊字符）：' + host,
      };
    }

    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return {
        matched: false,
        category: 'protocol',
        message: '只允许 HTTPS 外链或已登记的微信二维码 HTTP 地址',
      };
    }

    var matchingQr = null;
    for (var i = 0; i < WECHAT_QR_PREFIXES.length; i += 1) {
      var qr = WECHAT_QR_PREFIXES[i];
      var qrUrl = new URL(qr.prefix);
      if (
        urlObj.protocol === qrUrl.protocol &&
        host === qrUrl.hostname &&
        urlObj.pathname.indexOf(qrUrl.pathname) === 0 &&
        urlObj.pathname.length > qrUrl.pathname.length
      ) {
        matchingQr = qr;
        break;
      }
    }

    if (matchingQr) {
      if (input.indexOf('?') !== -1 || input.indexOf('#') !== -1) {
        return {
          matched: false,
          category: 'qr_url_parts',
          message: '微信二维码内容前缀后必须是纯路径，不允许查询串或片段',
        };
      }
      return {
        matched: true,
        category: 'qr_prefix',
        qrType: matchingQr.type,
        featureItem: matchingQr.featureItem,
        prefix: matchingQr.prefix,
        message:
          '匹配微信相关二维码前缀：' +
          matchingQr.label +
          '（功能项 ' +
          matchingQr.featureItem +
          '，前缀 ' +
          matchingQr.prefix +
          '）',
      };
    }

    if (urlObj.protocol !== 'https:') {
      return {
        matched: false,
        category: 'protocol',
        message: '外链必须使用 HTTPS；HTTP 只允许已登记的公众号二维码前缀',
      };
    }

    for (var j = 0; j < PLATFORM_CATALOG_DRAFT.length; j += 1) {
      var plat = PLATFORM_CATALOG_DRAFT[j];
      for (var k = 0; k < plat.domains.length; k += 1) {
        var suffix = plat.domains[k];
        if (host === suffix || host.slice(-(suffix.length + 1)) === '.' + suffix) {
          return {
            matched: true,
            category: 'platform_domain',
            code: plat.code,
            platformName: plat.name,
            matchedSuffix: suffix,
            hostname: host,
            message:
              '匹配平台目录域名白名单：' +
              plat.name +
              ' (' +
              plat.code +
              ')，主机名 ' +
              host +
              ' 命中后缀 ' +
              suffix,
          };
        }
      }
    }

    return {
      matched: false,
      category: 'unlisted_domain',
      hostname: host,
      message:
        '主机名 ' +
        host +
        ' 不在当前 pre-S2 平台目录白名单中（如为携程或其他平台真实分享短链域名，请记录到 S2 实测表）',
    };
  }

  var MANUAL_TEST_ITEMS = [
    { id: 'nfc', label: 'NFC 标签碰卡打开' },
    { id: 'qr', label: '二维码扫码打开' },
    { id: 'douyin', label: '发抖音唤起及 3 秒前台结果' },
    { id: 'wechat', label: '微信 Scheme 唤起及 3 秒前台结果' },
    { id: 'canshare', label: 'navigator.canShare 分享面板与视频保存结果' },
    { id: 'video', label: '降级直接下载并保存视频' },
    { id: 'image', label: '长按保存图片' },
    { id: 'copy', label: '复制文案' },
    { id: 'xiaohongshu', label: '小红书保存素材、复制文案并打开' },
    { id: 'moments', label: '朋友圈保存素材、复制文案并打开微信' },
    { id: 'store', label: '各平台门店页链接' },
    { id: 'account', label: '抖音、快手、小红书账号主页' },
    { id: 'qr-personal', label: '个人微信二维码识别' },
    { id: 'qr-wecom', label: '企业微信二维码识别' },
    { id: 'qr-wechat-group', label: '个人微信群二维码识别' },
    { id: 'qr-official', label: '公众号二维码识别' },
    { id: 'qr-channels', label: '视频号二维码识别及微信内识别' },
    { id: 'wecom', label: '企业微信获客链接唤起及 HTTPS 回退' },
    { id: 'amap', label: '高德地图 URI 导航' },
    { id: 'tel', label: 'tel: 拨号' },
  ];

  /** 将旧版合并二维码记录迁移为需分别复核的新记录。 */
  function migrateLegacyManualTests(savedTests) {
    var sourceTests = savedTests || {};
    var migratedTests = {};
    var legacyQrRows = {
      'qr-wecom': { source: 'qr-group', label: '企业微信、微信群二维码' },
      'qr-wechat-group': { source: 'qr-group', label: '企业微信、微信群二维码' },
      'qr-official': { source: 'qr-channel', label: '公众号、视频号二维码' },
      'qr-channels': { source: 'qr-channel', label: '公众号、视频号二维码' },
    };

    MANUAL_TEST_ITEMS.forEach(function (item) {
      var result = sourceTests[item.id] || {};
      var legacy = legacyQrRows[item.id];
      if (!result.status && legacy && sourceTests[legacy.source]) {
        var old = sourceTests[legacy.source];
        result = {
          status: '待确认',
          note:
            '旧版合并项“' +
            legacy.label +
            '”记录待拆分；原状态：' +
            (old.status || '待测') +
            '；原备注：' +
            (old.note || '无') +
            '。请分别复核本项。',
        };
      }
      migratedTests[item.id] = result;
    });
    return migratedTests;
  }

  function escapeMarkdownCell(value) {
    return String(value).replace(/[|\r\n]/g, function (char) {
      return char === '|' ? '\\|' : ' ';
    });
  }

  /** 汇总当前设备的身份信息和逐项 S2 真机结果。 */
  function formatDeviceRecordSummary(state) {
    var s = state || {};
    var env = s.env || parseS2Environment('');
    var entry = s.entry || detectEntryMode('', '');
    var device = s.deviceInfo || {};
    var tests = s.manualTests || {};
    var testRows = ['| 真机测试项 | 结果 | 备注或实际地址 |', '|---|---|---|'];

    MANUAL_TEST_ITEMS.forEach(function (item) {
      var result = tests[item.id] || {};
      testRows.push(
        '| ' +
          item.label +
          ' | ' +
          escapeMarkdownCell(result.status || '待测') +
          ' | ' +
          escapeMarkdownCell(result.note || '') +
          ' |',
      );
    });

    return [
      '| 设备型号 | 系统版本 | 浏览器或 App | 浏览器/App 版本 | UA | 内核及版本 | 入口模式 |',
      '|---|---|---|---|---|---|---|',
      '| ' +
        [
          escapeMarkdownCell(device.model || '待填写'),
          escapeMarkdownCell(device.osVersion || env.osLabel),
          escapeMarkdownCell(device.browserApp || env.hostLabel),
          escapeMarkdownCell(device.browserVersion || '待填写'),
          '`' + escapeMarkdownCell(env.ua || '-') + '`',
          escapeMarkdownCell(env.engineLabel),
          escapeMarkdownCell(entry.label),
        ].join(' | ') +
        ' |',
      '',
      testRows.join('\n'),
    ].join('\n');
  }

  /**
   * 在浏览器或测试 DOM 中初始化页面事件与展示状态。
   */
  function initS2Page(customDoc, customWin) {
    var doc = customDoc || (typeof document !== 'undefined' ? document : null);
    var win = customWin || (typeof window !== 'undefined' ? window : null);
    if (!doc) {
      return null;
    }

    var nav = (win && win.navigator) || (typeof navigator !== 'undefined' ? navigator : {});
    var loc = (win && win.location) || {
      href: FIXED_TEST_URLS.pagesPlainUrl,
      search: '',
    };

    var state = {
      entry: detectEntryMode(loc.search || '', loc.href || FIXED_TEST_URLS.pagesPlainUrl),
      env: parseS2Environment(nav.userAgent || ''),
      copyStatus: '未执行',
      canShareStatus: '未执行',
      downloadStatus: '未执行',
      imageSaveStatus: '未执行',
      launchStatus: '未执行',
      telStatus: '未执行',
      amapStatus: '未执行',
      deviceInfo: {},
      manualTests: {},
    };
    var recordStorage = null;
    var recordStorageKey = 'super-tap-s2-device-record-v1';
    try {
      recordStorage = win && win.localStorage;
    } catch (_e) {
      recordStorage = null;
    }

    function setText(id, text) {
      var el = doc.getElementById(id);
      if (el) {
        el.textContent = text;
      }
    }

    function updateSummary() {
      var out = doc.getElementById('record-summary-output');
      if (out) {
        syncRecordInputs(false);
        out.value = formatDeviceRecordSummary(state);
      }
    }

    function syncRecordInputs(save) {
      var deviceFields = {
        model: 'record-device-model',
        osVersion: 'record-os-version',
        browserApp: 'record-browser-app',
        browserVersion: 'record-browser-version',
      };
      state.deviceInfo = {};
      Object.keys(deviceFields).forEach(function (key) {
        var input = doc.getElementById(deviceFields[key]);
        state.deviceInfo[key] = input ? input.value : '';
      });

      state.manualTests = {};
      var statuses = doc.querySelectorAll('[data-record-status]');
      var notes = doc.querySelectorAll('[data-record-note]');
      for (var i = 0; i < statuses.length; i += 1) {
        var id = statuses[i].getAttribute('data-record-status');
        state.manualTests[id] = { status: statuses[i].value, note: '' };
      }
      for (var j = 0; j < notes.length; j += 1) {
        var noteId = notes[j].getAttribute('data-record-note');
        if (state.manualTests[noteId]) {
          state.manualTests[noteId].note = notes[j].value;
        }
      }

      if (save && recordStorage) {
        try {
          recordStorage.setItem(
            recordStorageKey,
            JSON.stringify({ deviceInfo: state.deviceInfo, manualTests: state.manualTests }),
          );
        } catch (_e) {
          // 本地存储不可用时仍可复制当前表单内容。
        }
      }
    }

    function setManualTest(id, statusValue, noteValue) {
      var status = doc.querySelector('[data-record-status="' + id + '"]');
      var note = doc.querySelector('[data-record-note="' + id + '"]');
      if (status && statusValue) {
        status.value = statusValue;
      }
      if (note && typeof noteValue === 'string') {
        note.value = noteValue;
      }
      syncRecordInputs(true);
      updateSummary();
    }

    function restoreRecordInputs() {
      if (!recordStorage) {
        return;
      }
      try {
        var saved = JSON.parse(recordStorage.getItem(recordStorageKey) || 'null');
        if (!saved) {
          return;
        }
        var device = saved.deviceInfo || {};
        var deviceFields = {
          model: 'record-device-model',
          osVersion: 'record-os-version',
          browserApp: 'record-browser-app',
          browserVersion: 'record-browser-version',
        };
        Object.keys(deviceFields).forEach(function (key) {
          var input = doc.getElementById(deviceFields[key]);
          if (input && typeof device[key] === 'string') {
            input.value = device[key];
          }
        });
        var savedTests = migrateLegacyManualTests(saved.manualTests || {});
        MANUAL_TEST_ITEMS.forEach(function (item) {
          var result = savedTests[item.id] || {};
          var status = doc.querySelector('[data-record-status="' + item.id + '"]');
          var note = doc.querySelector('[data-record-note="' + item.id + '"]');
          if (status && typeof result.status === 'string') {
            status.value = result.status;
          }
          if (note && typeof result.note === 'string') {
            note.value = result.note;
          }
        });
      } catch (_e) {
        try {
          recordStorage.removeItem(recordStorageKey);
        } catch (_ignored) {
          // 忽略损坏或不可用的本地记录。
        }
      }
    }

    function renderEnvironment(uaStr) {
      state.env = parseS2Environment(uaStr);
      setText('ua-raw', state.env.ua || '（空 User-Agent）');
      setText('env-os', state.env.osLabel);
      setText('env-host', state.env.hostLabel);
      setText('env-engine', state.env.engineLabel);
      setText('env-scheme-policy', state.env.schemePolicyText);
      setText('env-legacy-check', state.env.legacyCheckText);

      var canShareCheck = detectCanShareVideoSupport(nav, state.env);
      setText('canshare-support-status', canShareCheck.statusText);
      setText('video-save-fallback-guide', canShareCheck.fallbackGuide);

      var guideEl = doc.getElementById('open-in-browser-guide');
      if (guideEl && guideEl.classList) {
        if (state.env.blocksAppSchemes) {
          guideEl.classList.remove('hidden');
        } else {
          guideEl.classList.add('hidden');
        }
      }
      updateSummary();
    }

    setText('repo-url', FIXED_TEST_URLS.repoUrl);
    setText('fixed-url-plain', FIXED_TEST_URLS.pagesPlainUrl);
    setText('fixed-url-query', FIXED_TEST_URLS.pagesQueryUrl);
    setText('current-url', state.entry.href);
    setText('current-search', state.entry.search);
    setText('entry-mode', state.entry.label);

    restoreRecordInputs();
    syncRecordInputs(false);
    var recordControls = doc.querySelectorAll(
      '#record-device-model, #record-os-version, #record-browser-app, #record-browser-version, [data-record-status], [data-record-note]',
    );
    for (var recordIndex = 0; recordIndex < recordControls.length; recordIndex += 1) {
      recordControls[recordIndex].addEventListener('input', function () {
        syncRecordInputs(true);
        updateSummary();
      });
      recordControls[recordIndex].addEventListener('change', function () {
        syncRecordInputs(true);
        updateSummary();
      });
    }

    renderEnvironment(nav.userAgent || '');

    var uaSimBtn = doc.getElementById('ua-sim-btn');
    var uaResetBtn = doc.getElementById('ua-reset-btn');
    var uaSimInput = doc.getElementById('ua-sim-input');
    if (uaSimBtn && uaSimInput) {
      uaSimBtn.addEventListener('click', function () {
        renderEnvironment(uaSimInput.value || '');
      });
    }
    if (uaResetBtn) {
      uaResetBtn.addEventListener('click', function () {
        if (uaSimInput) {
          uaSimInput.value = '';
        }
        renderEnvironment(nav.userAgent || '');
      });
    }

    var copyBtn = doc.getElementById('copy-test-btn');
    var copyInput = doc.getElementById('copy-test-input');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var textToCopy = copyInput ? copyInput.value : '';
        copyTextWithFallback(textToCopy, {
          navigator: nav,
          document: doc,
          inputElement: copyInput,
        }).then(function (res) {
          state.copyStatus = res.method + (res.ok ? ':成功' : ':降级手动');
          setText('copy-test-result', res.message);
          setManualTest(
            'copy',
            '待确认',
            res.message + ' 请在目标 App 或输入框中粘贴验证后，再将复制文案记录改为成功或失败。',
          );
          updateSummary();
        });
      });
    }

    var canShareBtn = doc.getElementById('canshare-video-btn');
    if (canShareBtn) {
      var FileCtor = typeof File !== 'undefined' ? File : null;
      if (FileCtor && typeof fetch === 'function') {
        fetch('./sample.mp4', { cache: 'force-cache' })
          .then(function (response) {
            if (!response.ok) {
              throw new Error('sample unavailable');
            }
            return response.blob();
          })
          .then(function (videoBlob) {
            state.sampleVideoFile = new FileCtor([videoBlob], 'tap-test-sample.mp4', {
              type: 'video/mp4',
            });
            canShareBtn.disabled = false;
            setText('canshare-video-result', '同源 sample.mp4 已准备好，可以开始分享测试');
          })
          .catch(function () {
            setText('canshare-video-result', '测试视频未能读取；请使用直接下载链接完成降级保存测试');
          });
      } else {
        setText('canshare-video-result', '当前环境缺少 File 或 fetch，无法准备分享文件；请使用直接下载链接测试');
      }

      canShareBtn.addEventListener('click', function () {
        if (!state.sampleVideoFile) {
          setText('canshare-video-result', '测试视频未就绪，没有发起系统分享。请使用直接下载链接测试');
          return;
        }
        testCanShareVideo({
          navigator: nav,
          env: state.env,
          videoFile: state.sampleVideoFile,
        }).then(function (res) {
          state.canShareStatus = res.ok ? '分享面板已打开，待人工确认保存' : '降级说明';
          setText('canshare-video-result', res.message);
          if (res.ok) {
            setManualTest(
              'canshare',
              '待确认',
              'navigator.share 已完成交互；分享面板打开不代表视频已保存，请检查相册或文件后将结果改为成功或失败。',
            );
          } else if (res.supported === false) {
            setManualTest(
              'canshare',
              '受限',
              res.message + '；此结果只记录分享能力，不代表直接下载已保存。',
            );
          } else {
            setManualTest('canshare', '待确认', res.message + '；请按实际保存结果更新本项。');
          }
        });
      });
    }

    var downloadLink = doc.getElementById('download-video-link');
    if (downloadLink) {
      downloadLink.addEventListener('click', function () {
        state.downloadStatus = '已发起，待人工确认';
        setText(
          'download-video-result',
          '已发起直接下载 ./sample.mp4（文件名 tap-test-sample.mp4），请确认文件是否实际保存，再在逐项记录中填写结果。',
        );
        setManualTest(
          'video',
          '待确认',
          '已发起直接下载 ./sample.mp4；请检查相册或下载目录确认文件实际保存，再将降级直接下载并保存视频记录改为成功或失败。',
        );
        updateSummary();
      });
    }

    var markImgSavedBtn = doc.getElementById('mark-image-saved-btn');
    var markImgFailedBtn = doc.getElementById('mark-image-failed-btn');
    if (markImgSavedBtn) {
      markImgSavedBtn.addEventListener('click', function () {
        state.imageSaveStatus = '长按保存成功';
        setText('image-save-result', '已记录：长按保存图片成功');
        setManualTest('image', '成功', '用户已确认长按保存图片成功。');
        updateSummary();
      });
    }
    if (markImgFailedBtn) {
      markImgFailedBtn.addEventListener('click', function () {
        state.imageSaveStatus = '长按保存受限';
        setText('image-save-result', '已记录：当前环境长按保存图片受限，需引导至系统浏览器或使用分享面板');
        setManualTest('image', '失败', '用户已确认长按保存图片受限或失败；请改用系统浏览器或分享面板。');
        updateSummary();
      });
    }

    function bindLaunchButton(btnId) {
      var btn = doc.getElementById(btnId);
      if (!btn) {
        return;
      }
      btn.addEventListener('click', function () {
        var scheme = btn.getAttribute('data-scheme') || 'snssdk1128://';
        var platform = btn.getAttribute('data-platform') || 'App';
        var fallbackHttps = btn.getAttribute('data-fallback-https') || '';
        var fallbackNotice = doc.getElementById('foreground-fallback-notice');
        if (fallbackNotice && fallbackNotice.classList) {
          fallbackNotice.classList.add('hidden');
        }
        var recordId = btnId === 'launch-douyin-btn' ? 'douyin' : btnId === 'launch-wechat-btn' ? 'wechat' : 'wecom';
        setManualTest(recordId, '待确认', '已尝试 ' + scheme + '，等待 3 秒前台结果。请确认目标 App 是否实际打开。');
        var immediate = triggerAppLaunch({
          scheme: scheme,
          platform: platform,
          fallbackHttps: fallbackHttps,
          env: state.env,
          document: doc,
          navigate: function (targetUrl) {
            if (win && win.__s2PreventRealNavigation) {
              win.__s2LastNavigatedUrl = targetUrl;
              return;
            }
            if (win && win.location) {
              win.location.href = targetUrl;
            }
          },
          onResult: function (finalRes) {
            state.launchStatus =
              platform + (finalRes.stillInForeground ? ':3秒后仍在前台' : ':已切出前台');
            setText('launch-test-result', finalRes.message);
            setManualTest(
              recordId,
              '待确认',
              finalRes.message + ' 目标 App 是否打开需人工确认，再选择最终结果。',
            );
            if (fallbackNotice && fallbackNotice.classList) {
              if (finalRes.stillInForeground) {
                fallbackNotice.textContent = finalRes.message;
                if (finalRes.fallbackHttps) {
                  var fallbackLink = doc.createElement('a');
                  fallbackLink.href = finalRes.fallbackHttps;
                  fallbackLink.rel = 'noopener noreferrer';
                  fallbackLink.textContent = '打开企业微信 HTTPS 获客链接（测试地址）';
                  fallbackNotice.appendChild(doc.createElement('br'));
                  fallbackNotice.appendChild(fallbackLink);
                }
                fallbackNotice.classList.remove('hidden');
              } else {
                fallbackNotice.classList.add('hidden');
              }
            }
          },
        });
        state.launchStatus = platform + ':检测中';
        setText('launch-test-result', immediate.message);
        updateSummary();
      });
    }

    bindLaunchButton('launch-douyin-btn');
    bindLaunchButton('launch-wechat-btn');
    bindLaunchButton('launch-wecom-btn');

    var telLink = doc.getElementById('tel-link');
    if (telLink) {
      telLink.addEventListener('click', function () {
        state.telStatus = '已发起，待人工确认';
        setText('tel-test-result', '已发起拨号链接 tel:4000000000，请确认系统是否弹出拨号面板，再在逐项记录中填写结果。');
        setManualTest(
          'tel',
          '待确认',
          '已发起 tel:4000000000；请确认系统是否弹出拨号面板，再将 tel: 拨号记录改为成功或失败。',
        );
        updateSummary();
      });
    }

    function bindAmapLink(linkId, label) {
      var link = doc.getElementById(linkId);
      if (!link) {
        return;
      }
      link.addEventListener('click', function () {
        var href = link.getAttribute('href') || '';
        state.amapStatus = '已发起，待人工确认';
        setText('amap-test-result', '已发起高德地图导航 URI（' + label + '）：' + href + '。请确认是否实际打开目标，再在逐项记录中填写结果。');
        setManualTest(
          'amap',
          '待确认',
          '已发起高德地图 ' + label + ' URI；请确认高德地图是否实际打开目标，再将高德地图 URI 导航记录改为成功或失败。',
        );
        updateSummary();
      });
    }

    bindAmapLink('amap-marker-link', '坐标标点 marker');
    bindAmapLink('amap-search-link', '关键词搜索 search');

    var catalogBtn = doc.getElementById('catalog-check-btn');
    var catalogInput = doc.getElementById('catalog-check-input');
    if (catalogBtn && catalogInput) {
      catalogBtn.addEventListener('click', function () {
        var res = checkCatalogInput(catalogInput.value || '');
        setText('catalog-check-result', res.message);
      });
    }

    var copySummaryBtn = doc.getElementById('copy-summary-btn');
    var summaryOutput = doc.getElementById('record-summary-output');
    if (copySummaryBtn && summaryOutput) {
      copySummaryBtn.addEventListener('click', function () {
        copyTextWithFallback(summaryOutput.value || '', {
          navigator: nav,
          document: doc,
          inputElement: summaryOutput,
        }).then(function (res) {
          setText('copy-summary-result', res.message);
        });
      });
    }

    return state;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initS2Page(document, typeof window !== 'undefined' ? window : null);
      });
    } else {
      initS2Page(document, typeof window !== 'undefined' ? window : null);
    }
  }

  return {
    FIXED_TEST_URLS: FIXED_TEST_URLS,
    PLATFORM_CATALOG_DRAFT: PLATFORM_CATALOG_DRAFT,
    WECHAT_QR_PREFIXES: WECHAT_QR_PREFIXES,
    MANUAL_TEST_ITEMS: MANUAL_TEST_ITEMS,
    detectEntryMode: detectEntryMode,
    parseS2Environment: parseS2Environment,
    getVideoSaveFallbackGuide: getVideoSaveFallbackGuide,
    detectCanShareVideoSupport: detectCanShareVideoSupport,
    copyTextWithFallback: copyTextWithFallback,
    testCanShareVideo: testCanShareVideo,
    triggerAppLaunch: triggerAppLaunch,
    checkCatalogInput: checkCatalogInput,
    formatDeviceRecordSummary: formatDeviceRecordSummary,
    migrateLegacyManualTests: migrateLegacyManualTests,
    initS2Page: initS2Page,
  };
});
