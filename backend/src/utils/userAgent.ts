/**
 * A short, human description of a browser's User-Agent string for the "connected devices" list:
 * browser and operating system names and the kind of device. Unknown parts stay generic.
 */
export interface DeviceInfo {
  browser: string;
  os: string;
  type: "mobile" | "tablet" | "desktop";
}

const BROWSERS: [RegExp, string][] = [
  [/YaBrowser\//, "Yandex Browser"],
  [/Edg(e|A|iOS)?\//, "Microsoft Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
  [/TelegramBot|Telegram/, "Telegram"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows NT/, "Windows"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export const parseUserAgent = (ua: string | null | undefined): DeviceInfo => {
  const s = ua ?? "";
  const browser = BROWSERS.find(([re]) => re.test(s))?.[1] ?? "Brauzer";
  const os = SYSTEMS.find(([re]) => re.test(s))?.[1] ?? "";
  const type = /iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s)) ? "tablet" : /Mobi|iPhone|iPod|Android/.test(s) ? "mobile" : "desktop";
  return { browser, os, type };
};
