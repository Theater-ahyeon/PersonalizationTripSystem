#pragma once
#include "../models/models.h"
#include "../core/my_hashmap.h"
#include "../core/trie.h"

// 旅游日记交流模块

// 按目的地查找日记
MyVector<TravelDiary> searchByDestination(MyVector<TravelDiary>& diaries, std::string destination);

// 按标题精确查找（哈希表）
TravelDiary* searchByTitle(MyHashMap<std::string, TravelDiary>& titleIndex, std::string title);

// 全文检索（Trie+KMP）
MyVector<TravelDiary> fullTextSearch(Trie& trie, MyVector<TravelDiary>& diaries, std::string keyword);

// 哈夫曼压缩
std::string compressDiary(std::string content);

// 哈夫曼解压
std::string decompressDiary(std::string compressed);
