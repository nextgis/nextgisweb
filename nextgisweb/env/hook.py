import heapq
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Iterator, Literal, Protocol

from nextgisweb.lib.logging import logger

from .component import Component
from .package import pkginfo

HookStage = Literal["initial", "default", "final"]
HookOrder: dict[HookStage, int] = {
    "initial": -100,
    "default": 0,
    "final": +100,
}


class ComponentHookProtocol(Protocol):
    def __call__[C: Component](self, comp: C, /, *args, **kwargs) -> Any: ...


@dataclass(kw_only=True, frozen=True)
class ComponentHookEntry[P: ComponentHookProtocol]:
    func: P
    stage: HookStage = "default"
    before: Iterable[P] = ()
    after: Iterable[P] = ()
    cid: str


class ComponentHook[P: ComponentHookProtocol]:
    def __init__(self, name: str) -> None:
        self._name = name
        self._entries: list[ComponentHookEntry[P]] = []
        self._dirty = True

    def __call__(
        self,
        *,
        stage: HookStage = "default",
        before: Iterable[P] = (),
        after: Iterable[P] = (),
        cid: str | None = None,
    ) -> Callable[[P], P]:
        def decorator(func: P, *, cid: str | None = cid) -> P:
            if cid is None:
                cid = pkginfo.component_by_module(func.__module__)

            self._entries.append(
                ComponentHookEntry(
                    func=func,
                    stage=stage,
                    before=before,
                    after=after,
                    cid=cid,
                )
            )

            self._dirty = True
            return func

        return decorator

    def __iter__(self) -> Iterator[tuple[Component, P]]:
        from .environment import env

        for entry in self._sorted():
            comp = env.components[entry.cid]
            yield comp, entry.func

    def _sorted(self) -> list[ComponentHookEntry[P]]:
        if self._dirty:
            by_stage: dict[HookStage, list[ComponentHookEntry[P]]] = {}
            for entry in self._entries:
                by_stage.setdefault(entry.stage, []).append(entry)

            self._sorted_entries = [
                entry
                for stage in sorted(by_stage.keys(), key=lambda s: HookOrder[s])
                for entry in _topological_order(by_stage[stage])
            ]

            if len(self._sorted_entries) == 0:
                logger.debug("No entries for `%s`", self._name)
            else:
                logger.debug("Entries of `%s` in order:", self._name)
                for i, entry in enumerate(self._sorted_entries, start=1):
                    full_name = entry.func.__module__ + "." + entry.func.__qualname__
                    logger.debug("#%d: %s", i, full_name)

            self._dirty = False

        return self._sorted_entries


def _topological_order[P: ComponentHookProtocol](
    entries: list[ComponentHookEntry[P]],
) -> list[ComponentHookEntry]:
    n = len(entries)
    position = {id(entry.func): i for i, entry in enumerate(entries)}
    successors: list[set[int]] = [set() for _ in range(n)]
    in_degree = [0] * n

    def link(src: int, dst: int) -> None:
        if dst not in successors[src]:
            successors[src].add(dst)
            in_degree[dst] += 1

    for i, entry in enumerate(entries):
        for other in entry.before:
            if (j := position.get(id(other))) is not None and j != i:
                link(i, j)
        for other in entry.after:
            if (j := position.get(id(other))) is not None and j != i:
                link(j, i)

    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)
    ordered: list[ComponentHookEntry[P]] = []
    while heap:
        i = heapq.heappop(heap)
        ordered.append(entries[i])
        for j in sorted(successors[i]):
            in_degree[j] -= 1
            if in_degree[j] == 0:
                heapq.heappush(heap, j)

    if len(ordered) != n:
        raise ValueError("Circular dependency detected in hook entries")

    return ordered
