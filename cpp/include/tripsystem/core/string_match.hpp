#pragma once

#include <string>
#include <vector>

namespace tripsystem::core {

inline std::vector<int> kmp_prefix(const std::string& pattern) {
    std::vector<int> pi(pattern.size(), 0);
    for (std::size_t i = 1; i < pattern.size(); ++i) {
        int j = pi[i - 1];
        while (j > 0 && pattern[i] != pattern[static_cast<std::size_t>(j)]) {
            j = pi[static_cast<std::size_t>(j - 1)];
        }
        if (pattern[i] == pattern[static_cast<std::size_t>(j)]) {
            ++j;
        }
        pi[i] = j;
    }
    return pi;
}

inline bool kmp_contains(const std::string& text, const std::string& pattern) {
    if (pattern.empty()) {
        return true;
    }
    const auto pi = kmp_prefix(pattern);
    int j = 0;
    for (char ch : text) {
        while (j > 0 && ch != pattern[static_cast<std::size_t>(j)]) {
            j = pi[static_cast<std::size_t>(j - 1)];
        }
        if (ch == pattern[static_cast<std::size_t>(j)]) {
            ++j;
        }
        if (j == static_cast<int>(pattern.size())) {
            return true;
        }
    }
    return false;
}

}  // namespace tripsystem::core

