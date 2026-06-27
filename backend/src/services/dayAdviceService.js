const { Solar } = require('lunar-javascript');
const { pool } = require('../config/db');
const {
  translateActivity,
  translateDayOfficer,
  translateDayType,
  translateGanChi,
  translateTianShen,
} = require('../utils/lunarText');

const RULE_VERSION = 'rule-based-v2';
const POSITIVE_OFFICERS = new Set(['除', '满', '定', '成', '开']);
const NEGATIVE_OFFICERS = new Set(['破', '危', '闭']);
const GENERIC_GOOD_FOR = [
  'sắp xếp việc quan trọng đã chuẩn bị kỹ',
  'hoàn thiện hồ sơ, kế hoạch',
  'xử lý việc cần sự ổn định và rõ ràng',
];
const GENERIC_AVOID_FOR = [
  'khởi sự vội vàng khi chưa chuẩn bị',
  'quyết định cảm tính',
  'ôm quá nhiều việc cùng lúc',
];

async function getCachedAdvice(solarDate) {
  const [rows] = await pool.execute(
    'SELECT day_rating, good_for, avoid_for, summary FROM day_advice_cache WHERE solar_date = ? AND rule_version = ? LIMIT 1',
    [solarDate, RULE_VERSION],
  );

  if (rows.length === 0) {
    return null;
  }

  const cached = rows[0];

  let goodFor = [];
  let avoidFor = [];

  try {
    goodFor = typeof cached.good_for === 'string' ? JSON.parse(cached.good_for) : (cached.good_for || []);
    avoidFor = typeof cached.avoid_for === 'string' ? JSON.parse(cached.avoid_for) : (cached.avoid_for || []);
  } catch (parseError) {
    console.error('[DayAdviceService] Failed to parse good_for/avoid_for JSON from cache:', parseError);
  }

  return {
    day_rating: cached.day_rating,
    summary: cached.summary,
    good_for: goodFor,
    avoid_for: avoidFor,
  };
}

function parseSolarDate(solarDate) {
  const [year, month, day] = solarDate.split('-').map((value) => parseInt(value, 10));
  return { year, month, day };
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function translateAdviceItems(items) {
  return uniqueItems(
    items
      .filter((item) => item && item !== '无')
      .map((item) => translateActivity(item)),
  );
}

function limitAdviceItems(items, fallbackItems) {
  if (items.length > 0) {
    return items.slice(0, 5);
  }

  return fallbackItems;
}

function getGoodHours(lunar) {
  return lunar.getTimes().filter((time) => {
    return time.getTianShenType() === '黄道' || time.getTianShenLuck() === '吉';
  });
}

function calculateScore(lunar, yiList, jiList, goodHours) {
  let score = lunar.getDayTianShenType() === '黄道' ? 2 : -2;
  score += lunar.getDayTianShenLuck() === '吉' ? 1 : -1;

  const dayOfficer = lunar.getZhiXing();
  if (POSITIVE_OFFICERS.has(dayOfficer)) {
    score += 1;
  }
  if (NEGATIVE_OFFICERS.has(dayOfficer)) {
    score -= 1;
  }

  const yiCount = yiList.filter((item) => item !== '无').length;
  const jiCount = jiList.length;

  if (yiCount >= jiCount + 3) {
    score += 1;
  } else if (jiCount >= yiCount + 3) {
    score -= 1;
  }

  if (jiList.includes('诸事不宜')) {
    score -= 2;
  }

  if (jiList.includes('馀事勿取')) {
    score -= 1;
  }

  if (goodHours.length >= 6) {
    score += 1;
  }

  return score;
}

function determineRating(score) {
  if (score >= 3) {
    return 'favorable';
  }

  if (score <= -2) {
    return 'caution';
  }

  return 'neutral';
}

function buildSummary({
  rating,
  lunar,
  canChiDay,
  goodFor,
  avoidFor,
  goodHours,
}) {
  const dayTypeLabel = translateDayType(lunar.getDayTianShenType());
  const tianShenLabel = translateTianShen(lunar.getDayTianShen());
  const dayOfficerLabel = translateDayOfficer(lunar.getZhiXing());
  const goodPreview = goodFor.slice(0, 2).join(', ');
  const avoidPreview = avoidFor.slice(0, 2).join(', ');
  const goodHourText = `${goodHours.length} khung giờ cát`;

  if (rating === 'favorable') {
    return `${dayTypeLabel} (${tianShenLabel}), ${canChiDay} theo ${dayOfficerLabel} và có ${goodHourText}. Phù hợp để ${goodPreview || 'xử lý việc đã chuẩn bị kỹ'}; vẫn nên thận trọng khi ${avoidPreview || 'khởi sự quá gấp'}.`;
  }

  if (rating === 'caution') {
    return `${dayTypeLabel} (${tianShenLabel}), ${canChiDay} thiên về thận trọng hơn là bứt tốc. Nên hạn chế ${avoidPreview || 'khởi sự việc lớn'}; nếu vẫn phải xử lý việc quan trọng thì cần chuẩn bị kỹ và kiểm tra lại kế hoạch.`;
  }

  return `${dayTypeLabel} (${tianShenLabel}), ${canChiDay} ở mức trung tính với ${goodHourText}. Có thể ưu tiên ${goodPreview || 'các việc thường nhật'} nhưng nên cân nhắc kỹ khi ${avoidPreview || 'bắt đầu việc quá rủi ro'}.`;
}

function generateRuleBasedDayAdvice(solarDate, lunarDate, canChiDay) {
  const { year, month, day } = parseSolarDate(solarDate);
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();

  const normalizedLunarDate = lunarDate || `${lunar.getDay()}/${lunar.getMonth()} âm lịch`;
  const normalizedCanChiDay = canChiDay || translateGanChi(lunar.getDayInGanZhi());

  const rawYi = lunar.getDayYi() || [];
  const rawJi = lunar.getDayJi() || [];
  const goodHours = getGoodHours(lunar);
  const score = calculateScore(lunar, rawYi, rawJi, goodHours);
  const dayRating = determineRating(score);

  const translatedGoodFor = translateAdviceItems(rawYi).filter(
    (item) => item !== 'không có việc cát rõ rệt',
  );
  const translatedAvoidFor = translateAdviceItems(rawJi);

  const goodFor = limitAdviceItems(translatedGoodFor, GENERIC_GOOD_FOR);
  const avoidFor = limitAdviceItems(translatedAvoidFor, GENERIC_AVOID_FOR);
  const summary = buildSummary({
    rating: dayRating,
    lunar,
    canChiDay: normalizedCanChiDay,
    goodFor,
    avoidFor,
    goodHours,
  });

  return {
    solar_date: solarDate,
    lunar_date: normalizedLunarDate,
    can_chi_day: normalizedCanChiDay,
    day_rating: dayRating,
    summary,
    good_for: goodFor,
    avoid_for: avoidFor,
  };
}

async function saveAdviceToCache(advice) {
  await pool.execute(
    `INSERT INTO day_advice_cache
      (solar_date, lunar_date, can_chi_day, day_rating, good_for, avoid_for, summary, rule_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      advice.solar_date,
      advice.lunar_date,
      advice.can_chi_day,
      advice.day_rating,
      JSON.stringify(advice.good_for || []),
      JSON.stringify(advice.avoid_for || []),
      advice.summary,
      RULE_VERSION,
    ],
  );
}

async function getOrGenerateDayAdvice(solarDate, lunarDate, canChiDay) {
  try {
    const cachedAdvice = await getCachedAdvice(solarDate);
    if (cachedAdvice) {
      return cachedAdvice;
    }

    const advice = generateRuleBasedDayAdvice(solarDate, lunarDate, canChiDay);
    await saveAdviceToCache(advice);

    return {
      day_rating: advice.day_rating,
      summary: advice.summary,
      good_for: advice.good_for,
      avoid_for: advice.avoid_for,
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const cachedAdvice = await getCachedAdvice(solarDate);
      if (cachedAdvice) {
        return cachedAdvice;
      }
    }

    console.error('[DayAdviceService] Error in getOrGenerateDayAdvice:', error);

    return {
      day_rating: 'neutral',
      summary: 'Thông tin đánh giá ngày chưa sẵn sàng.',
      good_for: [],
      avoid_for: [],
    };
  }
}

module.exports = {
  generateRuleBasedDayAdvice,
  getOrGenerateDayAdvice,
};
