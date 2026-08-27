import { execSync } from "node:child_process";

function run(command) {
  console.log(`\n> ${command}\n`);

  execSync(command, {
    stdio: "inherit",
    shell: true,
  });
}

const message =
  process.argv.slice(2).join(" ").trim() ||
  "Update TCMS";

try {
  console.log("\n=== TCMS SAFE SAVE ===");

  console.log("\n1. Kiểm tra TypeScript...");
  run("npm.cmd run typecheck");

  console.log("\n2. Chạy security tests...");
  run("npm.cmd run test:security");

  console.log("\n3. Kiểm tra Git...");
  run("git status");

  console.log("\n4. Đưa thay đổi vào staging...");
  run("git add .");

  console.log("\n5. Tạo commit...");
  run(`git commit -m "${message.replaceAll('"', '\\"')}"`);

  console.log("\n6. Push lên GitHub...");
  run("git push origin main");

  console.log("\n=== HOÀN TẤT ===");
  console.log("TCMS đã được kiểm tra, commit và push lên GitHub.");
} catch {
  console.error("\n=== DỪNG ===");
  console.error("Có bước bị lỗi. Không tiếp tục các bước phía sau.");
  process.exit(1);
}