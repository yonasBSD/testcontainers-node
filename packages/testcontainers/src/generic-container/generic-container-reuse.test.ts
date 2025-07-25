import { randomUuid } from "../common/uuid";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer reuse", { timeout: 180_000 }, () => {
  it("should not reuse the container by default", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withName(name).withExposedPorts(8080).start()
    ).rejects.toThrowError();
  });

  it("should not reuse the container even when there is a candidate 1", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withName(name).withExposedPorts(8080).start()
    ).rejects.toThrowError();
  });

  it("should not reuse the container even when there is a candidate 2", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start()
    ).rejects.toThrowError();
  });

  it("should not reuse the container when TESTCONTAINERS_REUSE_ENABLE is set to false", async () => {
    vi.stubEnv("TESTCONTAINERS_REUSE_ENABLE", "false");

    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start()
    ).rejects.toThrowError();
  });

  it.each(["true", undefined])(
    "should reuse the container when TESTCONTAINERS_REUSE_ENABLE is set to %s",
    async (reuseEnable: string | undefined) => {
      vi.stubEnv("TESTCONTAINERS_REUSE_ENABLE", reuseEnable);

      const name = `there_can_only_be_one_${randomUuid()}`;
      await using container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container1);

      const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container2);

      expect(container1.getId()).toBe(container2.getId());
    }
  );

  it("should create a new container when an existing reusable container has stopped and is removed", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await container1.stop();

    await using container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).not.toBe(container2.getId());
  });

  it("should reuse stopped container, if configured withAutoRemove(false)", async () => {
    const name = `will_stop_and_reuse_again_${randomUuid()}`;
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .withAutoRemove(false)
      .start();
    await container1.stop({ timeout: 10000 });

    await using container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop({ remove: true });
  });

  it("should reuse container when an existing reusable container has stopped but not removed", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await container1.stop({ remove: false, timeout: 10000 });

    await using container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop();
  });

  it("should keep the labels passed in when a new reusable container is created", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`there_can_only_be_one_${randomUuid()}`)
      .withExposedPorts(8080)
      .withLabels({ test: "foo", bar: "baz" })
      .withReuse()
      .start();

    expect(container.getLabels()).toEqual(expect.objectContaining({ test: "foo" }));
  });

  it("should not create multiple reusable containers if called in parallel", async () => {
    const [container1, container2] = await Promise.all([
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
    ]);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop();
  });
});
