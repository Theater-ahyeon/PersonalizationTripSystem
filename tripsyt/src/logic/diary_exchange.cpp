#include "diary_exchange.h"
#include "../core/algorithm.h"

// 按目的地查找日记
MyVector<TravelDiary> searchByDestination(MyVector<TravelDiary>& diaries, std::string destination) {
    MyVector<TravelDiary> result;
    for (int i = 0; i < diaries.size(); ++i) {
        if (diaries[i].destination == destination) {
            result.push_back(diaries[i]);
        }
    }
    // 按热度降序排序
    fullSort(result, [](const TravelDiary& a, const TravelDiary& b) {
        return a.heat > b.heat;
    });
    return result;
}

// 按标题精确查找（哈希表）
TravelDiary* searchByTitle(MyHashMap<std::string, TravelDiary>& titleIndex, std::string title) {
    return titleIndex.find(title);
}

// 全文检索（Trie+KMP）
MyVector<TravelDiary> fullTextSearch(Trie& trie, MyVector<TravelDiary>& diaries, std::string keyword) {
    // 先通过Trie进行前缀搜索，获取候选日记ID
    MyVector<int> candidateIds = trie.searchPrefix(keyword);

    // 如果Trie前缀搜索有结果，收集对应日记
    MyVector<TravelDiary> result;
    if (!candidateIds.empty()) {
        // 去重
        MyVector<int> uniqueIds;
        for (int i = 0; i < candidateIds.size(); ++i) {
            bool dup = false;
            for (int j = 0; j < uniqueIds.size(); ++j) {
                if (uniqueIds[j] == candidateIds[i]) { dup = true; break; }
            }
            if (!dup) uniqueIds.push_back(candidateIds[i]);
        }
        // 根据ID查找日记
        for (int i = 0; i < uniqueIds.size(); ++i) {
            for (int j = 0; j < diaries.size(); ++j) {
                if (diaries[j].id == uniqueIds[i]) {
                    result.push_back(diaries[j]);
                    break;
                }
            }
        }
    }

    // 使用KMP对日记内容进行精确匹配，补充Trie未覆盖的结果
    for (int i = 0; i < diaries.size(); ++i) {
        // 检查是否已经在结果中
        bool alreadyIn = false;
        for (int j = 0; j < result.size(); ++j) {
            if (result[j].id == diaries[i].id) { alreadyIn = true; break; }
        }
        if (alreadyIn) continue;

        // KMP匹配标题和内容
        MyVector<int> titleMatches = kmpSearch(diaries[i].title, keyword);
        MyVector<int> contentMatches = kmpSearch(diaries[i].content, keyword);
        if (!titleMatches.empty() || !contentMatches.empty()) {
            result.push_back(diaries[i]);
        }
    }

    // 按热度排序
    fullSort(result, [](const TravelDiary& a, const TravelDiary& b) {
        return a.heat > b.heat;
    });

    return result;
}

// 哈夫曼压缩
std::string compressDiary(std::string content) {
    return huffmanCompress(content);
}

// 哈夫曼解压
std::string decompressDiary(std::string compressed) {
    return huffmanDecompress(compressed);
}
