module.exports = {
  apps: [
    {
      name: "trumpet.donald",
      script: "./dest/index.js",
      args: "-i config1.json",
      out_file: "./logs/trumpet-out.log",
      error_file: "./logs/trumpet-error.log",
      merge_logs: true,
      autorestart: true,
      env: { NODE_ENV: "production" }
    },
    {
      name: "pu.tintin",
      script: "./dest/index.js",
      args: "-i config2.json",
      out_file: "./logs/putin-out.log",
      error_file: "./logs/putin-error.log",
      merge_logs: true,
      autorestart: true,
      env: { NODE_ENV: "production" }
    },
    {
      name: "jongun.kim",
      script: "./dest/index.js",
      args: "-i config3.json",
      out_file: "./logs/jongun-out.log",
      error_file: "./logs/jongun-error.log",
      merge_logs: true,
      autorestart: true,
      env: { NODE_ENV: "production" }
    },
    {
      name: "tolam.csvn",
      script: "./dest/index.js",
      args: "-i config4.json",
      out_file: "./logs/tolam-out.log",
      error_file: "./logs/tolam-error.log",
      merge_logs: true,
      autorestart: true,
      env: { NODE_ENV: "production" }
    }
  ]
}
