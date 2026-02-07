import inquirer from "inquirer";
import axios from "axios";

const API = "http://localhost:3000";

export async function roomMenu(session) {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Rooms:",
      choices: ["Join room", "Create room", "List rooms", "Delete room", "Logout"],
    },
  ]);

  if (action === "List rooms") {
    await listRooms(session);
    return roomMenu(session);
  }

  if (action === "Create room") {
    await createRoom(session);
    return roomMenu(session);
  }

  if (action === "Delete room") {
    await deleteRoom(session);
    return roomMenu(session);
  }

  if (action === "Join room") {
    await joinRoom(session);
    return roomMenu(session);
  }

  if (action === "Logout") {
    process.exit(0);
  }
}

async function listRooms(session) {
  try {
    const res = await axios.get(`${API}/broadcast/listRooms`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });

    console.log("\nRooms:");

    if (!res.data.allRooms?.length) {
      console.log("No rooms found\n");
      return;
    }

    res.data.allRooms.forEach((r) => console.log("•", r.name));
    console.log();

  } catch (err) {
    console.error("Failed to list rooms");
  }
}

async function createRoom(session) {
  const { name } = await inquirer.prompt([
    { type: "input", name: "name", message: "Room name:" },
  ]);

  try {
    await axios.post(
      `${API}/broadcast/createRoom`,
      { name },
      { headers: { Authorization: `Bearer ${session.token}` } }
    );

    console.log("\nRoom created\n");

  } catch (err) {
    console.error("\nCould not create room");
  }
}

async function deleteRoom(session) {
  const { name } = await inquirer.prompt([
    { type: "input", name: "name", message: "Room name to delete:" },
  ]);

  try {
    await axios.delete(`${API}/broadcast/deleteRoom`, {
      data: { name },
      headers: { Authorization: `Bearer ${session.token}` },
    });

    console.log("\nRoom deleted\n");

  } catch (err) {
    console.error("\nCould not delete room");
  }
}

async function joinRoom(session) {
  const { room } = await inquirer.prompt([
    { type: "input", name: "room", message: "Room name:" },
  ]);

  const { startChat } = await import("./chat.js");
  await startChat(session, room);
}
