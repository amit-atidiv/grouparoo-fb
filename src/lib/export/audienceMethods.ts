import { objectCache, CacheKey } from "@grouparoo/core";
import { SimpleAppOptions } from "@grouparoo/core";
import { Client } from "../connect";
import { AudienceSubtype } from "./model";

export interface FacebookCacheData {
  appId: string;
  appOptions: SimpleAppOptions;
}

export async function getAudienceId(
  client: Client,
  cacheData: FacebookCacheData,
  subtype: AudienceSubtype,
  listName: string
): Promise<string> {
  const cacheDurationMs = 1000 * 60 * 10; // 10 minutes
  const { appId, appOptions } = cacheData;
  const cacheKey: CacheKey = ["getListId", subtype, listName, appOptions];
  const listId = await objectCache(
    { objectId: appId, cacheKey, cacheDurationMs },
    async () => {
      // not cached find it
      let facebookId = await findAudienceByName(client, subtype, listName);
      console.log("custome audience:",facebookId);
      if (facebookId) {
        return facebookId;
      }
      // otherwise, create it
      return createAudience(client, subtype, listName);
    }
  );
  return listId;
}

async function getAllAudiences(client: Client) {
  // could do extra caching here id needed
  console.log("inside get all audiences");
  const adAccount = client.adAccount();
  const fields = ["id", "name", "subtype"];
  const params =  {};
  const fetchFirstPage = true;
  let result = await adAccount.getCustomAudiences(fields, params, fetchFirstPage);
  const out = [];
  for (const audience of result) {
    const { id, name, subtype } = audience;
    out.push({ id, name, subtype });
  }
  result.forEach(c => console.log(c.name));
  while (result.hasNext()) {
      result = await result.next();
      for (const audience of result) {
        const { id, name, subtype } = audience;
        out.push({ id, name, subtype });
      }
      result.forEach(c => console.log(c.name));
  }
  /* console.log("hasnext *********************************************************************************************************************************************",result,"**************************************************************************************************************************************************"); */
  return out;
}
async function findAudienceByName(
  client: Client,
  subtype: AudienceSubtype,
  audienceName: string
): Promise<string> {
  const audiences = await getAllAudiences(client);
  console.log("audiences",audiences);
  for (const audience of audiences) {
    if (audienceName === audience.name && subtype === audience.subtype) {
      return audience.id;
    }
  }
  return null;
}

async function createAudience(
  client: Client,
  subtype: AudienceSubtype,
  name: string
): Promise<string> {
  const adAccount = client.adAccount();
  const fields = [];
  const params = {
    name,
    subtype,
    description: "Created from Grouparoo",
    customer_file_source: "USER_PROVIDED_ONLY",
  };
  const audience = await adAccount.createCustomAudience(fields, params);
  return audience.id;
}
