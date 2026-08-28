# Migrating to single ad serving

This release moves the SDK onto the v1.0.0 ad service. Ads are now requested **one
per zone per request** rather than arriving in bulk, and sessions are generated on
the client rather than issued by the server.

It is a breaking release. Everything below is either a change a consumer has to make
or a change in behaviour they need to know about. This page is the source for
updating the user facing documentation.

## Deprecated

### `acknowledgeAdded()`

Still works, still supported, but it cannot say **which** click it is confirming.

Clicking an "add to list" ad does not report the interaction on its own: the items
still have to reach the user's list, and only the host app knows whether they did.
The SDK therefore waits for the host to confirm. With ads served per zone, a user
can click one zone's "add to list" ad and then another's before the host has
finished with the first, so there can be more than one confirmation outstanding.

`acknowledgeAdded()` takes no arguments, so it resolves the **oldest** outstanding
click, and there are two ways that goes wrong.

The first is ordering. A host that confirms in the order it was called gets the right
answer; a host that confirms out of order — an async list write that resolves out of
order, or a confirmation UI the user dismisses out of order — reports each
interaction against the wrong ad.

The second is the ad popover, and it is the stronger reason to migrate. Items added
from inside a popover also arrive through `onAddItemsTriggered`, but that click's
interaction was already reported when the popover opened. Calling `acknowledgeAdded()`
for those items resolves some _unrelated_ outstanding click instead — reporting an
interaction the user never confirmed, while the popover's own add confirms nothing.
The handle has neither problem: it is bound to the click it came from, and the one
handed over for a popover add is inert because that interaction is already counted.

**Use the handle passed to `onAddItemsTriggered` instead.** It is bound to the click
it came from and cannot be misattributed:

```ts
onAddItemsTriggered: (items, adContent) => {
    void addItemsToUsersList(items).then(() => {
        adContent.acknowledge();
    });
};
```

`acknowledge()` is safe to call more than once — only the first call reports
anything — and safe to call late. A handle is abandoned when the SDK is torn down by
`unmount()` **or** re-initialized by a second `initialize()`, and acknowledging one
after that does nothing rather than reporting against whatever replaced it.

The equivalent before, which is what to migrate away from:

```ts
onAddItemsTriggered: (items) => {
    void addItemsToUsersList(items).then(() => {
        sdk.acknowledgeAdded();
    });
};
```

## Renamed

| Before                       | After                                   |
| ---------------------------- | --------------------------------------- |
| `onAdsRetrieved(map)`        | `onAdRetrieved(zoneId, hasAd)`          |
| `onAddItemsTriggered(items)` | `onAddItemsTriggered(items, adContent)` |
| `Ad.ad_id`                   | `Ad.id`                                 |

`onAddItemsTriggered` gains a second argument, the {@link AtlAdContent} handle
described under Deprecated. Existing handlers keep working — they simply ignore it —
but confirming through the handle is the only way to get the attribution right.

`onAdRetrieved` reports **one zone at a time**, as each zone's request resolves. The
old callback handed over a map of every zone at once. That map cannot be produced
honestly any more: zones answer on their own schedule, so building it would mean
guessing at the zones that had not answered yet, and a zone still waiting is not a
zone without an ad. A host that used the map to hide empty containers should now act
on each zone as it is reported.

## Removed

| Removed                                                                                                                         | Replacement                                                               |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `AdZoneInfo`                                                                                                                    | Zones are placed by `zonePlacements`; the SDK renders into your elements. |
| `AdPopup`, `Ad.popup`                                                                                                           | No longer served.                                                         |
| `Ad.type`, `Ad.tracking_html`, `Ad.hide_after_interaction`                                                                      | No longer served.                                                         |
| `Zone.id`, `Zone.ads[]`, `Zone.land_width`, `Zone.land_height`                                                                  | `Zone.ad` — a zone carries a single ad.                                   |
| `sessionInfo`                                                                                                                   | `getSessionId()`. There is no server session object any more.             |
| `adZones`                                                                                                                       | None. The SDK owns zone state.                                            |
| `lastSelectedATL`                                                                                                               | The handle passed to `onAddItemsTriggered`.                               |
| `cycleAdTimers`, `refreshAdZonesTimer`, `refreshSessionTimer`, `scrollEventAbortController`, `adZoneCurrentAdImpressionTracker` | None. Internal.                                                           |

Internal state is no longer declared at all: `zones`, `adZoneAdAvailabilityMap`,
`intersectionObserver`, `documentEventAbortController`, `hashedApiKey`,
`apiEnvString`, `sessionCreatedAt`, `sessionLastActiveAt`, `sessionPersistedAt` and
`sessionIsBackgrounded`. None of it was usable API. It can change at any time and
will not be treated as a breaking change.

## Added

- `AtlAdContent` — the acknowledgement handle described above.
- `Ad.zone_id` — the zone an ad was served into.
- `reportRecipeLoaded(recipeContextId, recipeContextZoneIds)` is now declared. It
  already existed and worked; it was simply missing from the type definitions.

## Type changes

These are now honest about what the service actually sends. Only the
`getSessionId()` row can produce a new `strictNullChecks` error in ordinary use:
after this release no public method or callback hands a consumer an `Ad`, a `Zone`
or an `AdPayload`, so the other three bite only for code that constructs those
types by hand.

| Member                          | Change                        |
| ------------------------------- | ----------------------------- |
| `Ad.payload`                    | now optional                  |
| `Zone.ad`                       | now optional                  |
| `AdPayload.detailed_list_items` | now optional                  |
| `getSessionId()`                | returns `string \| undefined` |

A no-fill is reported either as an `Ad` with an empty `id` or as no `ad` at all.
Treat both the same way.

## Behaviour changes with no signature change

These are the ones to call out loudest in the documentation: existing code keeps
compiling and then behaves differently.

- **One ad per zone per request.** Each zone requests its own ad and refreshes on its
  own `refresh_time`. There is no client side cycling through a list of ads.
- **Sessions are generated on the client** and cached in `localStorage` under
  `aa-session-v3-{env}-{hash of api key and advertiser ID}`. The session survives a
  reload, slides forward while the page is the user's focus, and rotates after 30
  minutes of inactivity. The two older key shapes are deleted on startup, for the
  current `apiEnv` only — a stale entry belonging to the other environment is left
  alone rather than risk clearing a session that is still in use.

    The advertiser ID is part of the key because a session is one person's visit to
    one app. Local storage is shared by everyone using the browser profile, so keying
    on the app alone meant that on a shared device the next person to sign in within
    the session window resumed the previous person's session, and the two of them
    reported under a single session ID. Signing back in as the same user still
    resumes that user's own session.

    The key deliberately does **not** include `storeId` or the recipe context. Those
    travel with each ad request rather than with the session, and `updateStoreId()`
    and `updateRecipeContextId()` change them without starting a new session — so
    keying on them would split one shopper browsing several stores into several
    sessions.

- **`onAdZonesRefreshed` fires per zone, per rotation**, not once per bulk refresh.
- **`scrollContainerId` is now the `IntersectionObserver` root**, not a scroll
  listener target. It must be an **ancestor of every placement element** — a zone
  outside it never counts as visible, so it records no impressions and never
  refreshes. Visibility is measured against that element's box rather than the
  browser viewport. Leave it unset to measure against the viewport.
- **Reports that the host does not read are sent with `keepalive`**, so they survive
  the page closing. The browser gives a document a single 64KB budget for keepalive
  bodies, shared with the host page's own beacons, and rejects a request outright
  past it — losing the whole report. The SDK therefore drops `keepalive` from any
  report whose body exceeds **48KB**, deliberately under that budget. Such a report
  still sends; it is just no longer guaranteed to survive the page closing.
- **Action type `"a"` (app store URL) is not handled.** The SDK logs that it cannot
  action the type and leaves the ad in place. This was also true before; it is
  documented here because the type is part of the published `AdActionType` union.
