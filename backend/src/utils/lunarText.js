const CAN_MAP = {
  '甲': 'Giáp',
  '乙': 'Ất',
  '丙': 'Bính',
  '丁': 'Đinh',
  '戊': 'Mậu',
  '己': 'Kỷ',
  '庚': 'Canh',
  '辛': 'Tân',
  '壬': 'Nhâm',
  '癸': 'Quý',
};

const CHI_MAP = {
  '子': 'Tý',
  '丑': 'Sửu',
  '寅': 'Dần',
  '卯': 'Mão',
  '辰': 'Thìn',
  '巳': 'Tỵ',
  '午': 'Ngọ',
  '未': 'Mùi',
  '申': 'Thân',
  '酉': 'Dậu',
  '戌': 'Tuất',
  '亥': 'Hợi',
};

const DAY_TYPE_MAP = {
  '黄道': 'Hoàng đạo',
  '黑道': 'Hắc đạo',
};

const TIAN_SHEN_MAP = {
  '青龙': 'Thanh Long',
  '明堂': 'Minh Đường',
  '金匮': 'Kim Quỹ',
  '天德': 'Thiên Đức',
  '玉堂': 'Ngọc Đường',
  '司命': 'Tư Mệnh',
  '天刑': 'Thiên Hình',
  '朱雀': 'Chu Tước',
  '白虎': 'Bạch Hổ',
  '天牢': 'Thiên Lao',
  '玄武': 'Huyền Vũ',
  '勾陈': 'Câu Trần',
};

const DAY_OFFICER_MAP = {
  '建': 'Trực Kiến',
  '除': 'Trực Trừ',
  '满': 'Trực Mãn',
  '平': 'Trực Bình',
  '定': 'Trực Định',
  '执': 'Trực Chấp',
  '破': 'Trực Phá',
  '危': 'Trực Nguy',
  '成': 'Trực Thành',
  '收': 'Trực Thu',
  '开': 'Trực Khai',
  '闭': 'Trực Bế',
};

const ACTIVITY_MAP = {
  '上梁': 'lên xà ngang',
  '乘船': 'đi thuyền',
  '习艺': 'học nghề',
  '交易': 'giao dịch',
  '伐木': 'đốn gỗ',
  '会亲友': 'gặp gỡ thân hữu',
  '作梁': 'dựng xà',
  '作灶': 'làm bếp',
  '修坟': 'tu sửa mộ phần',
  '修造': 'sửa chữa, xây cất',
  '修门': 'sửa cửa',
  '修饰垣墙': 'chỉnh trang tường rào',
  '入学': 'nhập học',
  '入宅': 'vào nhà mới',
  '入殓': 'nhập liệm',
  '冠笄': 'làm lễ trưởng thành',
  '出火': 'dời bếp',
  '出行': 'đi xa',
  '出货财': 'xuất hàng, luân chuyển tiền của',
  '分居': 'ra ở riêng',
  '割蜜': 'thu mật',
  '动土': 'động thổ',
  '取渔': 'đánh bắt',
  '合寿木': 'chuẩn bị thọ mộc',
  '合帐': 'làm rèm màn',
  '合脊': 'lợp nóc',
  '启钻': 'mở mộ, cải táng',
  '坏垣': 'phá tường',
  '塑绘': 'nặn tượng, vẽ tượng',
  '塞穴': 'bịt lỗ, lấp hang',
  '嫁娶': 'cưới hỏi',
  '安床': 'kê giường',
  '安机械': 'lắp đặt máy móc',
  '安碓磑': 'lắp cối xay',
  '安葬': 'an táng',
  '安门': 'lắp cửa',
  '安香': 'an vị bàn thờ',
  '定磉': 'đặt đá kê cột',
  '平治道涂': 'sửa đường sá',
  '开仓': 'mở kho',
  '开光': 'khai quang',
  '开厕': 'làm nhà vệ sinh',
  '开市': 'khai trương, mở bán',
  '开柱眼': 'khoan lỗ cột',
  '开池': 'đào ao',
  '开渠': 'mở kênh mương',
  '开生坟': 'làm sinh phần',
  '归宁': 'về thăm nhà cha mẹ',
  '归岫': 'trở về nơi an cư',
  '成服': 'mặc tang phục',
  '扫舍': 'dọn nhà',
  '拆卸': 'tháo dỡ',
  '挂匾': 'treo biển hiệu',
  '捕捉': 'bắt giữ, săn bắt',
  '掘井': 'đào giếng',
  '探病': 'thăm bệnh',
  '放水': 'xả nước, dẫn nước',
  '教牛马': 'huấn luyện gia súc',
  '整手足甲': 'cắt sửa móng tay chân',
  '斋醮': 'làm lễ cầu an',
  '断蚁': 'diệt sâu kiến',
  '无': 'không có việc cát rõ rệt',
  '普渡': 'cúng cô hồn, phổ độ',
  '架马': 'dựng chuồng ngựa',
  '栽种': 'trồng trọt',
  '求医': 'cầu chữa bệnh',
  '求嗣': 'cầu con',
  '沐浴': 'tắm gội, tẩy uế',
  '治病': 'chữa bệnh',
  '牧养': 'chăn nuôi',
  '理发': 'cắt tóc',
  '畋猎': 'săn bắn',
  '盖屋': 'lợp nhà',
  '破土': 'phá đất',
  '破屋': 'dỡ nhà',
  '祈福': 'cầu phúc',
  '祭祀': 'cúng lễ',
  '移徙': 'chuyển chỗ ở',
  '移柩': 'di quan',
  '立券': 'lập khế ước',
  '立碑': 'dựng bia',
  '竖柱': 'dựng cột',
  '筑堤': 'đắp đê',
  '纳婿': 'nhận rể',
  '纳畜': 'nhập gia súc',
  '纳财': 'thu tiền, nhận tài lộc',
  '纳采': 'dạm ngõ',
  '经络': 'điều trị kinh lạc',
  '结网': 'giăng lưới',
  '置产': 'mua tài sản',
  '行丧': 'đưa tang',
  '补垣': 'sửa tường',
  '裁衣': 'cắt may quần áo',
  '解除': 'giải trừ',
  '订盟': 'đính ước, ký kết',
  '词讼': 'kiện tụng, tranh chấp',
  '诸事不宜': 'không nên khởi sự việc lớn',
  '谢土': 'tạ đất',
  '赴任': 'nhận chức, đi nhậm chức',
  '起基': 'khởi công nền móng',
  '进人口': 'đón thêm người vào nhà',
  '造仓': 'làm kho',
  '造庙': 'dựng miếu',
  '造桥': 'làm cầu',
  '造畜稠': 'dựng chuồng trại',
  '造船': 'đóng thuyền',
  '造车器': 'làm xe, chế tác dụng cụ',
  '针灸': 'châm cứu',
  '问名': 'hỏi cưới',
  '除服': 'mãn tang',
  '雇佣': 'thuê mướn',
  '雕刻': 'chạm khắc',
  '馀事勿取': 'không nên làm thêm việc khác',
};

function translateGanChi(ganChiStr) {
  if (!ganChiStr || ganChiStr.length < 2) {
    return ganChiStr;
  }

  const gan = CAN_MAP[ganChiStr[0]] || ganChiStr[0];
  const chi = CHI_MAP[ganChiStr[1]] || ganChiStr[1];

  return `${gan} ${chi}`;
}

function translateDayType(dayType) {
  return DAY_TYPE_MAP[dayType] || dayType;
}

function translateTianShen(name) {
  return TIAN_SHEN_MAP[name] || name;
}

function translateDayOfficer(name) {
  return DAY_OFFICER_MAP[name] || name;
}

function translateActivity(name) {
  return ACTIVITY_MAP[name] || name;
}

module.exports = {
  translateActivity,
  translateDayOfficer,
  translateDayType,
  translateGanChi,
  translateTianShen,
};
