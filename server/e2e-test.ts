/**
 * @file YYC³ AI Family - E2E 端点自动化验证脚本
 * @description 自动测试 API 代理的全部 10 个 RESTful 端点
 * @module server/e2e-test
 * @version 0.9.4
 * @since Personalize
 *
 * YYC³ AI Family - E2E Endpoint Automated Verification Script
 * Automatically tests all 10 RESTful endpoints of the API proxy
 *
 * 使用方式 / Usage:
 *   cd server && npm run e2e:test
 *   -- 或 / or --
 *   npx tsx e2e-test.ts
 *   npx tsx e2e-test.ts http://localhost:3721   # 自定义 baseUrl
 */

/* ──────────────────── 配置 / Config ──────────────────── */

const BASE_URL = process.argv[2] ?? "http://localhost:3721";
const API_BASE = `${BASE_URL}/api/v1`;

/** 测试用临时聊天 ID / Test temporary chat ID */
const TEST_CHAT_ID = `e2e-test-${Date.now()}`;

/* ──────────────────── 类型定义 / Type Definitions ──────────────────── */

interface TestResult {
  /** 测试编号 / Test number */
  index: number;
  /** 端点描述 / Endpoint description */
  name: string;
  /** HTTP 方法 / HTTP method */
  method: string;
  /** 请求路径 / Request path */
  path: string;
  /** 是否通过 / Passed */
  passed: boolean;
  /** HTTP 状态码 / HTTP status code */
  status: number;
  /** 耗时 (ms) / Duration (ms) */
  duration: number;
  /** 错误信息 / Error message */
  error: string | null;
}

/* ──────────────────── 工具函数 / Utility Functions ──────────────────── */

/**
 * 发送请求并记录结果
 * Send request and record result
 */
async function testEndpoint(
  index: number,
  name: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  expectedStatus?: number
): Promise<TestResult> {
  const start = Date.now();
  const url = `${API_BASE}${path}`;
  const expected = expectedStatus ?? 200;

  try {
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const duration = Date.now() - start;
    const passed = response.status === expected;

    let error: string | null = null;
    if (!passed) {
      const text = await response.text();
      error = `Expected ${expected}, got ${response.status}: ${text.slice(0, 100)}`;
    }

    return { index, name, method, path, passed, status: response.status, duration, error };
  } catch (err) {
    return {
      index,
      name,
      method,
      path,
      passed: false,
      status: 0,
      duration: Date.now() - start,
      error: err instanceof Error ? err.message : "FETCH_FAILED",
    };
  }
}

/* ──────────────────── 测试套件 / Test Suite ──────────────────── */

async function runTests(): Promise<void> {
  const line = "═".repeat(72);

  process.stdout.write(`\n${line}\n`);
  process.stdout.write(`  YYC³ AI Family - E2E Endpoint Verification\n`);
  process.stdout.write(`  Target: ${API_BASE}\n`);
  process.stdout.write(`  Timestamp: ${new Date().toISOString()}\n`);
  process.stdout.write(`${line}\n\n`);

  const results: TestResult[] = [];

  /* ── Test 1: GET /health ── */
  results.push(await testEndpoint(
    1,
    "健康检查 / Health Check",
    "GET",
    "/health"
  ));

  /* ── Test 2: GET /tables ── */
  results.push(await testEndpoint(
    2,
    "表清单 / List Tables",
    "GET",
    "/tables"
  ));

  /* ── Test 3: GET /migrations/status ── */
  results.push(await testEndpoint(
    3,
    "迁移状态 / Migration Status",
    "GET",
    "/migrations/status"
  ));

  /* ── Test 4: POST /migrations/run ── */
  results.push(await testEndpoint(
    4,
    "执行迁移 / Run Migrations",
    "POST",
    "/migrations/run"
  ));

  /* ── Test 5: POST /data/:table (Insert) ── */
  results.push(await testEndpoint(
    5,
    "插入记录 / Insert Record",
    "POST",
    "/data/chats",
    {
      id: TEST_CHAT_ID,
      channel_id: "main",
      title: "E2E Test Chat",
      messages: "[]",
    },
    201
  ));

  /* ── Test 6: GET /data/:table (List) ── */
  results.push(await testEndpoint(
    6,
    "列表查询 / List Records",
    "GET",
    "/data/chats?limit=5&orderBy=updated_at&orderDir=DESC"
  ));

  /* ── Test 7: GET /data/:table/:id (Single) ── */
  results.push(await testEndpoint(
    7,
    "单条查询 / Get Single Record",
    "GET",
    `/data/chats/${TEST_CHAT_ID}`
  ));

  /* ── Test 8: PUT /data/:table/:id (Update) ── */
  results.push(await testEndpoint(
    8,
    "更新记录 / Update Record",
    "PUT",
    `/data/chats/${TEST_CHAT_ID}`,
    { title: "E2E Test Chat - Updated" }
  ));

  /* ── Test 9: POST /query (Structured Query) ── */
  results.push(await testEndpoint(
    9,
    "结构化查询 / Structured Query",
    "POST",
    "/query",
    {
      table: "agents",
      action: "SELECT",
      columns: ["agent_id", "name", "status"],
      conditions: [{ column: "status", operator: "=", value: "active" }],
      orderBy: [{ column: "name", direction: "ASC" }],
      limit: 10,
    }
  ));

  /* ── Test 10: DELETE /data/:table/:id (Delete) ── */
  results.push(await testEndpoint(
    10,
    "删除记录 / Delete Record",
    "DELETE",
    `/data/chats/${TEST_CHAT_ID}`
  ));

  /* ──────────────────── 结果输出 / Results Output ──────────────────── */

  process.stdout.write("\n");

  const maxNameLen = Math.max(...results.map(r => r.name.length));

  for (const r of results) {
    const icon = r.passed ? "✓" : "✗";
    const color = r.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    const paddedName = r.name.padEnd(maxNameLen);
    const methodPad = r.method.padEnd(6);

    process.stdout.write(
      `  ${color}${icon}${reset} [${String(r.index).padStart(2, "0")}] ${methodPad} ${r.path.padEnd(35)} ${paddedName}  ${r.duration}ms  ${r.status}\n`
    );

    if (r.error) {
      process.stdout.write(`       \x1b[31m└─ ${r.error}\x1b[0m\n`);
    }
  }

  /* ──────────────────── 汇总 / Summary ──────────────────── */

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  process.stdout.write(`\n${line}\n`);
  process.stdout.write(`  RESULTS: ${passed} passed, ${failed} failed, ${results.length} total\n`);
  process.stdout.write(`  TOTAL DURATION: ${totalDuration}ms\n`);
  process.stdout.write(`${line}\n\n`);

  // 退出码：有失败则返回 1 / Exit code: 1 if any failures
  if (failed > 0) {
    process.exit(1);
  }
}

/* ──────────────────── 执行 / Execute ──────────────────── */
runTests();
