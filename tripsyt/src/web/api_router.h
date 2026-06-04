#pragma once
// API路由注册与处理
// 将HTTP请求路由到对应的业务逻辑处理函数

#include "core/tourism_system.h"
#include "adapter/json_util.h"

// 前向声明httplib
namespace httplib {
    class Server;
}

// 注册所有API路由
void registerApiRoutes(httplib::Server& svr, TourismSystem& sys);
