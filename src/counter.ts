import { base64decode } from "@protobuf-ts/runtime";
import { PlayerLeft, PlayerUpdate } from "./gen/PlayerData";
import { Value } from "./gen/google/protobuf/struct";

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0;
  const setCounter = (count: number) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener("click", () => setCounter(counter + 1));
  setCounter(0);
}

function getValueFrom(value: Value) {
  switch (value.kind.oneofKind) {
    case "nullValue":
      return value.kind.nullValue;
    case "numberValue":
      return value.kind.numberValue;
    case "stringValue":
      return value.kind.stringValue;
    case "boolValue":
      return value.kind.boolValue;
    case "structValue":
      return value.kind.structValue;
    case "listValue":
      return value.kind.listValue;
    default:
      return undefined;
  }
}

function getHtmlElementForPlayer(id: number) {
  if (document.querySelector("[data-player-internal-id='" + id + "']")) {
    return document.querySelector<HTMLDivElement>(
      "[data-player-internal-id='" + id + "']"
    );
  }

  const playerTemplate =
    document.querySelector<HTMLTemplateElement>("#player-template");

  const positionTemplate =
    document.querySelector<HTMLTemplateElement>("#position-template");
  
    const identifierTemplate = document.querySelector<HTMLTemplateElement>(
    "#identifier-template"
  );

  if (!playerTemplate || !positionTemplate || !identifierTemplate) {
    return null;
  }

  const playerFrag = document.importNode(playerTemplate.content, true);
  const position = document.importNode(positionTemplate.content, true);
  const identifier = document.importNode(identifierTemplate.content, true);

  console.log("player", playerFrag);

  const player = playerFrag.children[0] as HTMLDivElement;

  player.id = `player-${id}`;
  player.setAttribute("data-player-internal-id", id.toString());
  player.appendChild(position);
  player.appendChild(identifier);

  const playerList = document.querySelector<HTMLUListElement>("#player-list");
  if (playerList) {
    playerList.appendChild(playerFrag);
  }


  return player;
}

function doPlayerUpdate (data: PlayerUpdate) {
  const player = getHtmlElementForPlayer(data.id);
    if (!player) {
      return;
    }

    if (data.data?.name){
      player.querySelector(".player-name")!.innerHTML = data.data.name;
    }

    const position = player.querySelector(".position");
    const identifier = player.querySelector(".identifiers");

    const positionData = data.data?.position;

    if (positionData && position) {
      const xElement = position.querySelector("[data-position='x']");
      const yElement = position.querySelector("[data-position='y']");
      const zElement = position.querySelector("[data-position='z']");

      if (xElement) {
        xElement.innerHTML = positionData.x.toString();
      }

      if (yElement) {
        yElement.innerHTML = positionData.y.toString();
      }

      if (zElement) {
        zElement.innerHTML = positionData.z.toString();
      }
    }

    const identifierData = data.data?.identifiers;
    if (identifierData && identifier){
      console.log("identifiers", identifierData);
        // loop through the identifiers
        for (const [key, value] of Object.entries(identifierData)) {
          console.log("key", key, "value", value);
            const identifierElement = identifier.querySelector<HTMLParagraphElement>(`[data-identifier='${key}']`);
            const val = getValueFrom(value);

            if (!identifierElement) {
                continue;
            }

            if(val == null || val == undefined){
              // Update display to "hidden"
              identifierElement.style.display = "none";
            }else{
              // Update display to "block"
              identifierElement.style.display = "block";
              identifierElement.querySelector("span")!.innerHTML = val.toString();
            }

        }
    }

}

export function connectToSseEndpoint() {
  const eventSource = new EventSource(
    "http://localhost:30120/live_map_git/sse"
  );

  // All data inside messages are a UTF-8 representation of a Protobuf message
  eventSource.addEventListener("playerJoin", (event) => {
    const byteArray = base64decode(event.data);
    const data = PlayerUpdate.fromBinary(byteArray);
    //console.log("playerJoin", data);
    doPlayerUpdate(data);
  });

  eventSource.addEventListener("playerLeave", (event) => {
    const bytes = base64decode(event.data);
    const data = PlayerLeft.fromBinary(bytes);
    //console.log("playerLeave", data);
  });

  eventSource.addEventListener("playerUpdate", (event) => {
    const byteArray = base64decode(event.data);
    const data = PlayerUpdate.fromBinary(byteArray);
    //console.log("playerUpdate", data);

    doPlayerUpdate(data);

  });

  eventSource.addEventListener("connected", () => {
    console.log("connected!!");
  });

  eventSource.onmessage = (event) => {
    console.log("event", event);
  };

  return eventSource;
}
