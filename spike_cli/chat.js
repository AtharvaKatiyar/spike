import WebSocket from "ws";
import readline from "readline";
import chalk from "chalk";

function printLine(text) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(text);
}


export function startChat(session, roomName) {
  return new Promise((resolve) => {

    console.log(`\nConnecting to room "${roomName}"...\n`);

    const wsUrl = `ws://localhost:3000?token=${session.token}&room=${roomName}`;
    const ws = new WebSocket(wsUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    ws.on("open", () => {
      console.log(chalk.green(`✅ Connected to ${roomName}`));
      console.log(chalk.gray("Type messages. Use /exit to leave room.\n"));
rl.setPrompt("> ");
rl.prompt();

    });

    ws.on("message", (data) => {
  let payload;

  try {
    payload = JSON.parse(data.toString());
  } catch {
    return;
  }

  if (payload.type === "history") {
    printLine(chalk.gray("\n--- previous messages ---"));

    payload.messages.forEach((m) => {
      printLine(
        chalk.gray(`[${new Date(m.timestamp).toLocaleTimeString()}]`) +
          ` ${chalk.cyan(m.from)}: ${m.content}`
      );
    });

    printLine(chalk.gray("-------------------------\n"));
    rl.prompt(true);
    return;
  }

  if (payload.type === "message") {
    printLine(
      chalk.gray(`[${new Date(payload.timestamp).toLocaleTimeString()}]`) +
        ` ${chalk.cyan(payload.from)}: ${payload.content}`
    );
    rl.prompt(true);
    return;
  }

  if (payload.type === "notification") {
    if (payload.event === "join") {
      printLine(chalk.green(`✓ ${payload.user} joined`));
    }

    if (payload.event === "leave") {
      printLine(chalk.red(`✗ ${payload.user} left`));
    }

    rl.prompt(true);
  }
});


    ws.on("close", () => {
      rl.close();
      console.log(chalk.red("\nDisconnected from room.\n"));
      resolve();
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });

    rl.on("line", (input) => {
  const trimmed = input.trim();

  if (trimmed === "/exit") {
    printLine(chalk.gray("leaving room...\n"));
    ws.close();
    return;
  }

  if (!trimmed) {
    rl.prompt();
    return;
  }

  ws.send(
    JSON.stringify({
      type: "message",
      content: trimmed,
    })
  );

  rl.prompt();
});


    process.on("SIGINT", () => {
      ws.close();
      rl.close();
      resolve();
    });
  });
}
