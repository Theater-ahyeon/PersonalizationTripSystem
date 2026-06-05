#pragma once

#include <cctype>
#include <filesystem>
#include <fstream>
#include <regex>
#include <sstream>
#include <string>
#include <vector>

namespace tripsystem {

namespace fs = std::filesystem;

inline std::string readText(const fs::path& path) {
    std::ifstream in(path, std::ios::binary);
    if (!in) return "";
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

inline void writeText(const fs::path& path, const std::string& text) {
    fs::create_directories(path.parent_path());
    std::ofstream out(path, std::ios::binary);
    out << text;
}

inline std::string trim(const std::string& s) {
    size_t b = 0;
    while (b < s.size() && std::isspace(static_cast<unsigned char>(s[b]))) ++b;
    size_t e = s.size();
    while (e > b && std::isspace(static_cast<unsigned char>(s[e - 1]))) --e;
    return s.substr(b, e - b);
}

inline std::string escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
        case '\\': out += "\\\\"; break;
        case '"':  out += "\\\""; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default:   out += c; break;
        }
    }
    return out;
}

inline std::string unescapeJson(std::string s) {
    std::string out;
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '\\' && i + 1 < s.size()) {
            char n = s[++i];
            if (n == 'n') out += '\n';
            else out += n;
        } else {
            out += s[i];
        }
    }
    return out;
}

inline std::vector<std::string> split(const std::string& s, char sep) {
    std::vector<std::string> res;
    std::stringstream ss(s);
    std::string item;
    while (std::getline(ss, item, sep)) {
        item = trim(item);
        if (!item.empty()) res.push_back(item);
    }
    return res;
}

inline std::vector<std::string> jsonObjects(const std::string& text) {
    // Lightweight scanner for the project data files. It tracks quoted strings so
    // braces inside text fields do not split objects; nested objects are not used
    // by the current schema and should be added here before changing data shape.
    std::vector<std::string> objects;
    int depth = 0;
    bool inString = false;
    size_t start = std::string::npos;
    for (size_t i = 0; i < text.size(); ++i) {
        char c = text[i];
        if (c == '"' && (i == 0 || text[i - 1] != '\\')) inString = !inString;
        if (inString) continue;
        if (c == '{') {
            if (depth == 0) start = i;
            ++depth;
        } else if (c == '}') {
            --depth;
            if (depth == 0 && start != std::string::npos) {
                objects.push_back(text.substr(start, i - start + 1));
            }
        }
    }
    return objects;
}

inline std::string jsonString(const std::string& obj, const std::string& key, const std::string& def = "") {
    // Covers escaped quotes, backslashes and simple control escapes emitted by
    // escapeJson(). If new JSON fields store nested arrays/objects as strings,
    // add cases here and in unescapeJson() before consuming them in DataManager.
    std::regex re("\\\"" + key + "\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"");
    std::smatch m;
    if (std::regex_search(obj, m, re)) return unescapeJson(m[1]);
    return def;
}

inline double jsonNumber(const std::string& obj, const std::string& key, double def = 0.0) {
    std::regex re("\\\"" + key + "\\\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)");
    std::smatch m;
    if (std::regex_search(obj, m, re)) return std::stod(m[1]);
    return def;
}

inline std::vector<std::string> jsonStringArray(const std::string& obj, const std::string& key) {
    // Current arrays are flat: ["tag", "tag2"]. Nested arrays are intentionally
    // unsupported to keep the no-external-library parser predictable.
    std::regex arrayRe("\\\"" + key + "\\\"\\s*:\\s*\\[([^\\]]*)\\]");
    std::smatch m;
    if (!std::regex_search(obj, m, arrayRe)) return {};
    std::vector<std::string> values;
    std::string body = m[1];
    std::regex itemRe("\\\"((?:\\\\.|[^\\\"])*)\\\"");
    for (auto it = std::sregex_iterator(body.begin(), body.end(), itemRe); it != std::sregex_iterator(); ++it) {
        values.push_back(unescapeJson((*it)[1]));
    }
    return values;
}

inline std::vector<int> jsonNumberArray(const std::string& obj, const std::string& key) {
    std::regex arrayRe("\\\"" + key + "\\\"\\s*:\\s*\\[([^\\]]*)\\]");
    std::smatch m;
    if (!std::regex_search(obj, m, arrayRe)) return {};
    std::vector<int> values;
    std::string body = m[1];
    std::regex itemRe("-?[0-9]+");
    for (auto it = std::sregex_iterator(body.begin(), body.end(), itemRe); it != std::sregex_iterator(); ++it) {
        values.push_back(std::stoi((*it).str()));
    }
    return values;
}

inline std::vector<int> kmpTable(const std::string& pat) {
    std::vector<int> next(pat.size(), 0);
    for (size_t i = 1, j = 0; i < pat.size(); ++i) {
        while (j > 0 && pat[i] != pat[j]) j = next[j - 1];
        if (pat[i] == pat[j]) ++j;
        next[i] = static_cast<int>(j);
    }
    return next;
}

inline bool kmpContains(const std::string& text, const std::string& pat) {
    if (pat.empty()) return true;
    auto next = kmpTable(pat);
    for (size_t i = 0, j = 0; i < text.size(); ++i) {
        while (j > 0 && text[i] != pat[j]) j = next[j - 1];
        if (text[i] == pat[j]) ++j;
        if (j == pat.size()) return true;
    }
    return false;
}

} // namespace tripsystem
