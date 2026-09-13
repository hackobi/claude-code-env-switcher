"use client";
import { Profile, Platform } from "../../engine/types";
export function ProfileFields({
  value: p,
  onChange,
  step,
  creating = false,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
  step: number;
  creating?: boolean;
}) {
  const put = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    onChange({ ...p, [k]: v });
  const field = (
    label: string,
    k:
      | "name"
      | "slug"
      | "website"
      | "description"
      | "audience"
      | "voice"
      | "facts",
    area = false,
  ) => (
    <label className="field">
      {label}
      {area ? (
        <textarea
          value={p[k]}
          onChange={(e) => put(k, e.target.value)}
          rows={4}
        />
      ) : (
        <input
          value={p[k]}
          onChange={(e) => put(k, e.target.value)}
          disabled={k === "slug" && !creating}
        />
      )}
    </label>
  );
  const list = (
    label: string,
    k: "keywords" | "avoid" | "peers" | "hashtags",
  ) => (
    <label className="field">
      {label}
      <input
        value={p[k].join(", ")}
        onChange={(e) =>
          put(
            k,
            e.target.value.split(",").map((x) => x.trim()),
          )
        }
      />
    </label>
  );
  const restaurant = p.restaurant || {
    address: "",
    district: "",
    hours: "",
    booking: "",
    menu: "",
    events: "",
    alcohol: false,
    licenceHolder: "",
    photoRights: false,
  };
  const rf = (
    label: string,
    k:
      | "address"
      | "district"
      | "hours"
      | "booking"
      | "menu"
      | "events"
      | "licenceHolder",
    area = false,
  ) => (
    <label className="field">
      {label}
      {area ? (
        <textarea
          rows={4}
          value={restaurant[k]}
          onChange={(e) =>
            put("restaurant", { ...restaurant, [k]: e.target.value })
          }
        />
      ) : (
        <input
          value={restaurant[k]}
          onChange={(e) =>
            put("restaurant", { ...restaurant, [k]: e.target.value })
          }
        />
      )}
    </label>
  );
  return (
    <div className="form-grid">
      {step === 0 && (
        <>
          {field("Client name", "name")}
          {field("Workspace address", "slug")}
          <label className="field">
            Industry
            <select
              value={p.industry}
              disabled={!creating}
              onChange={(e) => {
                const industry = e.target.value as Profile["industry"];
                onChange({
                  ...p,
                  industry,
                  restaurant:
                    industry === "restaurant" ? restaurant : undefined,
                  language: industry === "restaurant" ? "nb" : "en",
                  channels:
                    industry === "technology"
                      ? ["x", "threads", "linkedin", "bluesky"]
                      : ["instagram", "facebook"],
                  sources:
                    industry === "restaurant"
                      ? [
                          "brief",
                          "google-trends",
                          "norway-calendar",
                          "oslo-weather",
                          "oslo-news",
                        ]
                      : ["brief"],
                });
              }}
            >
              <option value="other">Other business</option>
              <option value="technology">Technology</option>
              <option value="restaurant">Restaurant</option>
            </select>
          </label>
          {field("Website", "website")}
          {field("What does this business offer?", "description", true)}
          {field("Who should the content reach?", "audience", true)}
        </>
      )}
      {step === 1 && (
        <>
          {field("Brand voice", "voice", true)}
          {field("Verified facts, products and offers", "facts", true)}
          {list("Topics / keywords (comma-separated)", "keywords")}
          {list("Words to avoid", "avoid")}
          {list("Peer accounts / inspiration", "peers")}
          {list("Approved hashtags", "hashtags")}
          <label className="field">
            Language
            <select
              value={p.language}
              onChange={(e) =>
                put("language", e.target.value as Profile["language"])
              }
            >
              <option value="en">English</option>
              <option value="nb">Norsk bokmål</option>
              <option value="nb+en">Bokmål with an English line</option>
            </select>
          </label>
          <label className="field">
            Brand colour
            <input
              type="color"
              value={p.color}
              onChange={(e) => put("color", e.target.value)}
            />
          </label>
        </>
      )}
      {step === 2 && (
        <>
          <fieldset className="wide">
            <legend>Channels for this client</legend>
            <div className="checks">
              {(
                [
                  "x",
                  "instagram",
                  "facebook",
                  "threads",
                  "linkedin",
                  "bluesky",
                ] as Platform[]
              ).map((v) => (
                <label key={v}>
                  <input
                    type="checkbox"
                    checked={p.channels.includes(v)}
                    onChange={(e) =>
                      put(
                        "channels",
                        e.target.checked
                          ? [...p.channels, v]
                          : p.channels.filter((x) => x !== v),
                      )
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Timezone
            <input
              value={p.timezone}
              onChange={(e) => put("timezone", e.target.value)}
            />
          </label>
          <fieldset className="wide">
            <legend>Sources</legend>
            <div className="checks">
              {(
                [
                  "brief",
                  "google-trends",
                  "norway-calendar",
                  "oslo-weather",
                  "oslo-news",
                  "rapidapi",
                  "apify-x",
                ] as Profile["sources"]
              ).map((v) => (
                <label key={v}>
                  <input
                    type="checkbox"
                    checked={p.sources.includes(v)}
                    onChange={(e) =>
                      put(
                        "sources",
                        e.target.checked
                          ? [...p.sources, v]
                          : p.sources.filter((x) => x !== v),
                      )
                    }
                  />
                  {v.replace(/-/g, " ")}
                </label>
              ))}
            </div>
            <p className="muted">
              You can connect publishing accounts and API keys after creating
              the workspace. Instagram trend scanning is planned for a later
              release.
            </p>
          </fieldset>
        </>
      )}
      {step === 3 && (
        <>
          {p.industry === "restaurant" ? (
            <>
              {rf("Address", "address")}
              {rf("Neighbourhood", "district")}
              {rf("Opening hours", "hours")}
              {rf("Booking link / phone", "booking")}
              {rf("Menu, prices, allergens and signature dishes", "menu", true)}
              {rf(
                "Upcoming events, seasonal dishes and holiday hours",
                "events",
                true,
              )}
              <label className="check wide">
                <input
                  type="checkbox"
                  checked={restaurant.alcohol}
                  onChange={(e) =>
                    put("restaurant", {
                      ...restaurant,
                      alcohol: e.target.checked,
                    })
                  }
                />
                Alcohol is served on the premises
              </label>
              {restaurant.alcohol &&
                rf("Licence holder / required approver", "licenceHolder")}
              <p className="muted wide">
                Upload real photos in the media library after setup. Tag visible
                alcohol and confirm permission to use each photo, including any
                people shown.
              </p>
            </>
          ) : (
            <p className="muted wide">
              Your drafts will be reviewed in this workspace before being sent
              to the connected publishing service.
            </p>
          )}
          <label className="field">
            Owner / approver name
            <input
              value={p.approver.name}
              onChange={(e) =>
                put("approver", { ...p.approver, name: e.target.value })
              }
            />
          </label>
          <label className="field">
            Approver email
            <input
              type="email"
              value={p.approver.email}
              onChange={(e) =>
                put("approver", { ...p.approver, email: e.target.value })
              }
            />
          </label>
          {p.industry === "restaurant" && (
            <p className="notice wide">
              Restaurant posts require both operator and owner approval. The
              owner review link shows the exact copy and media.
            </p>
          )}
        </>
      )}
    </div>
  );
}
