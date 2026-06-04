#pragma once
// JSON构建与解析工具
// 不依赖第三方JSON库，手动实现JSON字符串构建和简单解析

#include "core/my_stl.h"
#include <string>
#include <sstream>
#include <cmath>

// ==================== JsonBuilder ====================
// 用于构建JSON字符串
class JsonBuilder {
private:
    std::ostringstream oss_;
    bool needComma_ = false; // 是否需要逗号分隔

    // 转义JSON字符串
    static std::string escape(const std::string& s) {
        std::string result;
        for (size_t i = 0; i < s.size(); i++) {
            char c = s[i];
            switch (c) {
                case '"':  result += "\\\""; break;
                case '\\': result += "\\\\"; break;
                case '\n': result += "\\n"; break;
                case '\r': result += "\\r"; break;
                case '\t': result += "\\t"; break;
                default:
                    if ((unsigned char)c < 0x20) {
                        char buf[8];
                        snprintf(buf, sizeof(buf), "\\u%04x", (unsigned char)c);
                        result += buf;
                    } else {
                        result += c;
                    }
            }
        }
        return result;
    }

    void addComma() {
        if (needComma_) oss_ << ",";
        needComma_ = false;
    }

public:
    JsonBuilder() { oss_.str(""); }

    // 开始对象
    JsonBuilder& startObject() {
        addComma();
        oss_ << "{";
        needComma_ = false;
        return *this;
    }

    // 结束对象
    JsonBuilder& endObject() {
        oss_ << "}";
        needComma_ = true;
        return *this;
    }

    // 开始数组
    JsonBuilder& startArray() {
        addComma();
        oss_ << "[";
        needComma_ = false;
        return *this;
    }

    // 结束数组
    JsonBuilder& endArray() {
        oss_ << "]";
        needComma_ = true;
        return *this;
    }

    // 添加键
    JsonBuilder& key(const std::string& k) {
        addComma();
        oss_ << "\"" << escape(k) << "\":";
        needComma_ = false;
        return *this;
    }

    // 添加字符串值
    JsonBuilder& value(const std::string& v) {
        addComma();
        oss_ << "\"" << escape(v) << "\"";
        needComma_ = true;
        return *this;
    }

    // 添加整数值
    JsonBuilder& value(int v) {
        addComma();
        oss_ << v;
        needComma_ = true;
        return *this;
    }

    // 添加长整数值
    JsonBuilder& value(long long v) {
        addComma();
        oss_ << v;
        needComma_ = true;
        return *this;
    }

    // 添加双精度浮点值
    JsonBuilder& value(double v) {
        addComma();
        if (std::isinf(v) || std::isnan(v)) {
            oss_ << "null";
        } else {
            // 保留合理精度
            char buf[64];
            snprintf(buf, sizeof(buf), "%.6g", v);
            oss_ << buf;
        }
        needComma_ = true;
        return *this;
    }

    // 添加布尔值
    JsonBuilder& value(bool v) {
        addComma();
        oss_ << (v ? "true" : "false");
        needComma_ = true;
        return *this;
    }

    // 添加null值
    JsonBuilder& null() {
        addComma();
        oss_ << "null";
        needComma_ = true;
        return *this;
    }

    // 添加原始JSON字符串（不转义）
    JsonBuilder& raw(const std::string& json) {
        addComma();
        oss_ << json;
        needComma_ = true;
        return *this;
    }

    // 获取结果字符串
    std::string toString() const {
        return oss_.str();
    }
};

// ==================== JSON响应构建 ====================
// 构建标准API响应
inline std::string jsonResponse(int code, const std::string& message, const std::string& data) {
    JsonBuilder j;
    j.startObject();
    j.key("code").value(code);
    j.key("message").value(message);
    j.key("data").raw(data.empty() ? "null" : data);
    j.endObject();
    return j.toString();
}

// 成功响应
inline std::string jsonSuccess(const std::string& data) {
    return jsonResponse(0, "success", data);
}

// 错误响应
inline std::string jsonError(int code, const std::string& message) {
    return jsonResponse(code, message, "null");
}

// ==================== 查询字符串解析 ====================
// 解析URL查询字符串为HashMap
inline MyHashMap<std::string, std::string> parseQueryString(const std::string& query) {
    MyHashMap<std::string, std::string> result;
    if (query.empty()) return result;

    size_t start = 0;
    while (start < query.size()) {
        // 找到&分隔符
        size_t ampPos = query.find('&', start);
        std::string pair = (ampPos == std::string::npos)
            ? query.substr(start)
            : query.substr(start, ampPos - start);

        // 找到=分隔符
        size_t eqPos = pair.find('=');
        if (eqPos != std::string::npos) {
            std::string key = pair.substr(0, eqPos);
            std::string val = pair.substr(eqPos + 1);
            // URL解码（简化版）
            std::string decoded;
            for (size_t i = 0; i < val.size(); i++) {
                if (val[i] == '%' && i + 2 < val.size()) {
                    char hex[3] = { val[i + 1], val[i + 2], 0 };
                    decoded += (char)strtol(hex, nullptr, 16);
                    i += 2;
                } else if (val[i] == '+') {
                    decoded += ' ';
                } else {
                    decoded += val[i];
                }
            }
            result.insert(key, decoded);
        } else if (!pair.empty()) {
            result.insert(pair, "");
        }

        if (ampPos == std::string::npos) break;
        start = ampPos + 1;
    }
    return result;
}

// ==================== 简单JSON Body解析 ====================
// 从JSON字符串中提取字符串值
inline std::string jsonGetString(const std::string& json, const std::string& key) {
    std::string searchKey = "\"" + key + "\"";
    size_t pos = json.find(searchKey);
    if (pos == std::string::npos) return "";

    // 找到冒号后的值
    pos = json.find(':', pos + searchKey.size());
    if (pos == std::string::npos) return "";

    // 跳过空白
    pos++;
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t' || json[pos] == '\n')) pos++;

    if (pos >= json.size()) return "";

    if (json[pos] == '"') {
        // 字符串值
        size_t start = pos + 1;
        size_t end = start;
        while (end < json.size()) {
            if (json[end] == '"' && (end == 0 || json[end - 1] != '\\')) break;
            end++;
        }
        return json.substr(start, end - start);
    }
    return "";
}

// 从JSON字符串中提取整数值
inline int jsonGetInt(const std::string& json, const std::string& key, int defaultVal = 0) {
    std::string searchKey = "\"" + key + "\"";
    size_t pos = json.find(searchKey);
    if (pos == std::string::npos) return defaultVal;

    pos = json.find(':', pos + searchKey.size());
    if (pos == std::string::npos) return defaultVal;

    pos++;
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) pos++;

    std::string numStr;
    bool negative = false;
    if (pos < json.size() && json[pos] == '-') { negative = true; pos++; }
    while (pos < json.size() && json[pos] >= '0' && json[pos] <= '9') {
        numStr += json[pos++];
    }
    if (numStr.empty()) return defaultVal;
    int val = 0;
    for (size_t i = 0; i < numStr.size(); i++) {
        val = val * 10 + (numStr[i] - '0');
    }
    return negative ? -val : val;
}

// 从JSON字符串中提取双精度值
inline double jsonGetDouble(const std::string& json, const std::string& key, double defaultVal = 0.0) {
    std::string searchKey = "\"" + key + "\"";
    size_t pos = json.find(searchKey);
    if (pos == std::string::npos) return defaultVal;

    pos = json.find(':', pos + searchKey.size());
    if (pos == std::string::npos) return defaultVal;

    pos++;
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) pos++;

    std::string numStr;
    if (pos < json.size() && json[pos] == '-') { numStr += '-'; pos++; }
    while (pos < json.size() && ((json[pos] >= '0' && json[pos] <= '9') || json[pos] == '.')) {
        numStr += json[pos++];
    }
    if (numStr.empty()) return defaultVal;
    return atof(numStr.c_str());
}

// 从JSON字符串中提取数组中的整数
inline MyVector<int> jsonGetIntArray(const std::string& json, const std::string& key) {
    MyVector<int> result;
    std::string searchKey = "\"" + key + "\"";
    size_t pos = json.find(searchKey);
    if (pos == std::string::npos) return result;

    pos = json.find('[', pos + searchKey.size());
    if (pos == std::string::npos) return result;

    pos++; // 跳过[
    while (pos < json.size() && json[pos] != ']') {
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\t')) pos++;
        if (pos >= json.size() || json[pos] == ']') break;

        std::string numStr;
        if (json[pos] == '-') { numStr += '-'; pos++; }
        while (pos < json.size() && json[pos] >= '0' && json[pos] <= '9') {
            numStr += json[pos++];
        }
        if (!numStr.empty() && numStr != "-") {
            result.push_back(atoi(numStr.c_str()));
        }
    }
    return result;
}

// ==================== 数据序列化辅助 ====================
// Area -> JSON
inline std::string areaToJson(const Area& a) {
    JsonBuilder j;
    j.startObject();
    j.key("id").value(a.id);
    j.key("name").value(a.name);
    j.key("category").value(a.category);
    j.key("heat").value(a.heat);
    j.key("rating").value(a.rating);
    j.key("description").value(a.description);
    j.key("province").value(a.province);
    j.endObject();
    return j.toString();
}

// Building -> JSON
inline std::string buildingToJson(const Building& b) {
    JsonBuilder j;
    j.startObject();
    j.key("id").value(b.id);
    j.key("areaId").value(b.areaId);
    j.key("name").value(b.name);
    j.key("type").value(b.type);
    j.key("floors").value(b.floors);
    j.key("description").value(b.description);
    j.key("nodeId").value(b.nodeId);
    j.endObject();
    return j.toString();
}

// Facility -> JSON
inline std::string facilityToJson(const Facility& f) {
    JsonBuilder j;
    j.startObject();
    j.key("id").value(f.id);
    j.key("areaId").value(f.areaId);
    j.key("name").value(f.name);
    j.key("category").value(f.category);
    j.key("nodeId").value(f.nodeId);
    j.endObject();
    return j.toString();
}

// User -> JSON
inline std::string userToJson(const User& u) {
    JsonBuilder j;
    j.startObject();
    j.key("id").value(u.id);
    j.key("username").value(u.username);
    j.key("nickname").value(u.nickname);
    j.key("avatar").value(u.avatar);
    j.endObject();
    return j.toString();
}

// Diary -> JSON
inline std::string diaryToJson(const Diary& d) {
    JsonBuilder j;
    j.startObject();
    j.key("id").value(d.id);
    j.key("userId").value(d.userId);
    j.key("title").value(d.title);
    j.key("content").value(d.compressed ? "[已压缩]" : d.content);
    j.key("destination").value(d.destination);
    j.key("views").value(d.views);
    j.key("rating").value(d.rating);
    j.key("ratingCount").value(d.ratingCount);
    j.key("compressed").value(d.compressed);
    j.key("createTime").value(d.createTime);
    j.endObject();
    return j.toString();
}

// Food -> JSON
inline std::string foodToJson(const Food& f) {
    JsonBuilder j;
    j.startObject();
    j.key("id").value(f.id);
    j.key("areaId").value(f.areaId);
    j.key("name").value(f.name);
    j.key("cuisine").value(f.cuisine);
    j.key("restaurant").value(f.restaurant);
    j.key("heat").value(f.heat);
    j.key("rating").value(f.rating);
    j.key("distance").value(f.distance);
    j.endObject();
    return j.toString();
}

// PathResult -> JSON
inline std::string pathResultToJson(const PathResult& pr) {
    JsonBuilder j;
    j.startObject();
    j.key("found").value(pr.found);
    j.key("totalDistance").value(pr.totalDistance);
    j.key("totalTime").value(pr.totalTime);
    j.key("path").startArray();
    for (size_t i = 0; i < pr.path.size(); i++) {
        j.value(pr.path[i]);
    }
    j.endArray();
    j.endObject();
    return j.toString();
}

// IndoorPathResult -> JSON
inline std::string indoorPathResultToJson(const IndoorPathResult& pr) {
    JsonBuilder j;
    j.startObject();
    j.key("found").value(pr.found);
    j.key("path").startArray();
    for (size_t i = 0; i < pr.path.size(); i++) {
        j.value(pr.path[i]);
    }
    j.endArray();
    j.key("instructions").startArray();
    for (size_t i = 0; i < pr.instructions.size(); i++) {
        j.value(pr.instructions[i]);
    }
    j.endArray();
    j.endObject();
    return j.toString();
}

// 向量序列化辅助
template<typename T>
inline std::string vectorToJson(const MyVector<T>& items, std::string(*itemToJson)(const T&)) {
    JsonBuilder j;
    j.startArray();
    for (size_t i = 0; i < items.size(); i++) {
        j.raw(itemToJson(items[i]));
    }
    j.endArray();
    return j.toString();
}
