import { createClient } from "@clickhouse/client";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ClickHouseContainer } from "./clickhouse-container";

const IMAGE = getImage(__dirname);

interface ClickHouseQueryResponse<T> {
  data: T[];
}

describe("ClickHouseContainer", { timeout: 180_000 }, () => {
  // connectWithOptions {
  it("should connect using the client options object", async () => {
    await using container = await new ClickHouseContainer(IMAGE).start();
    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });
    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });
  // }

  // connectWithUrl {
  it("should connect using the URL", async () => {
    await using container = await new ClickHouseContainer(IMAGE).start();
    const client = createClient({
      url: container.getConnectionUrl(),
    });

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });
  // }

  // connectWithUsernameAndPassword {
  it("should connect using the username and password", async () => {
    await using container = await new ClickHouseContainer(IMAGE)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();

    const client = createClient({
      url: container.getHttpUrl(),
      username: container.getUsername(),
      password: container.getPassword(),
    });

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const customDatabase = "customDatabase";
    await using container = await new ClickHouseContainer(IMAGE).withDatabase(customDatabase).start();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT currentDatabase() AS current_database",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ current_database: string }>;
    expect(data?.data?.[0]?.current_database).toBe(customDatabase);

    await client.close();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const customUsername = "customUsername";
    await using container = await new ClickHouseContainer(IMAGE).withUsername(customUsername).start();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT currentUser() AS current_user",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ current_user: string }>;
    expect(data?.data?.[0]?.current_user).toBe(customUsername);

    await client.close();
  });
  // }

  it("should work with restarted container", async () => {
    await using container = await new ClickHouseContainer(IMAGE).start();
    await container.restart();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });
});
