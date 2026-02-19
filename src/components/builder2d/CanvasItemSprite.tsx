import type { CSSProperties } from "react";

import type { LibraryAsset } from "@/components/builder2d/types";

type CanvasItemSpriteProps = {
  asset: LibraryAsset;
  scale: number;
};

export function spriteSizeForVariant(asset: LibraryAsset): { width: number; height: number } {
  switch (asset.variant) {
    case "carpet":
      return { width: 132, height: 36 };
    case "stem":
      return { width: 88, height: 120 };
    case "rosette":
      return { width: 112, height: 70 };
    case "rock":
      return { width: 132, height: 96 };
    case "wood":
      return { width: 150, height: 102 };
  }
}

function LeafCluster(props: { asset: LibraryAsset }) {
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((index) => {
        const offset = (index - 3) * 8;
        const rotate = (index - 3) * 13;
        const height = 42 + Math.abs(index - 3) * 4;
        return (
          <span
            key={`${props.asset.id}-leaf-${index}`}
            className="absolute left-1/2 bottom-0 w-4 -translate-x-1/2 rounded-full"
            style={{
              height,
              transform: `translateX(${offset}px) rotate(${rotate}deg)`,
              transformOrigin: "center bottom",
              background: `linear-gradient(180deg, ${props.asset.colorB}, ${props.asset.colorA})`,
              boxShadow: "inset 0 -8px 10px rgba(0,0,0,0.14)",
            }}
          />
        );
      })}
    </>
  );
}

function StemCluster(props: { asset: LibraryAsset }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((index) => {
        const x = 12 + index * 14;
        const stemHeight = 70 + (index % 2) * 18;
        return (
          <span
            key={`${props.asset.id}-stem-${index}`}
            className="absolute bottom-0 w-2 rounded-full"
            style={{
              left: x,
              height: stemHeight,
              background: `linear-gradient(180deg, ${props.asset.colorB}, ${props.asset.colorA})`,
            }}
          />
        );
      })}
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const x = 14 + (index % 3) * 24;
        const y = 26 + Math.floor(index / 3) * 28;
        const rotate = index % 2 === 0 ? -26 : 26;
        return (
          <span
            key={`${props.asset.id}-stem-leaf-${index}`}
            className="absolute h-4 w-10 rounded-full"
            style={{
              left: x,
              bottom: y,
              transform: `rotate(${rotate}deg)`,
              background: `linear-gradient(90deg, ${props.asset.colorA}, ${props.asset.colorB})`,
              boxShadow: "inset 0 -3px 5px rgba(0,0,0,0.16)",
            }}
          />
        );
      })}
    </>
  );
}

function CarpetCluster(props: { asset: LibraryAsset }) {
  return (
    <>
      <span
        className="absolute inset-x-0 bottom-0 h-6 rounded-full"
        style={{
          background: `linear-gradient(180deg, ${props.asset.colorB}, ${props.asset.colorA})`,
          boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
        const x = 8 + index * 14;
        const bladeHeight = 10 + (index % 3) * 5;
        return (
          <span
            key={`${props.asset.id}-blade-${index}`}
            className="absolute bottom-4 w-1 rounded-full"
            style={{
              left: x,
              height: bladeHeight,
              background: props.asset.colorB,
            }}
          />
        );
      })}
    </>
  );
}

function RockCluster(props: { asset: LibraryAsset }) {
  return (
    <>
      <span
        className="absolute inset-0"
        style={{
          borderRadius: "52% 44% 56% 39% / 46% 59% 41% 54%",
          background: `linear-gradient(135deg, ${props.asset.colorB}, ${props.asset.colorA})`,
          boxShadow: "inset -16px -10px 20px rgba(0,0,0,0.2), 0 8px 14px rgba(0,0,0,0.22)",
        }}
      />
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={`${props.asset.id}-hole-${index}`}
          className="absolute rounded-full bg-black/35"
          style={{
            left: 18 + index * 18,
            top: 18 + (index % 2) * 20,
            width: 8 + (index % 3) * 4,
            height: 6 + (index % 2) * 5,
            transform: `rotate(${index * 17}deg)`,
          }}
        />
      ))}
    </>
  );
}

function WoodCluster(props: { asset: LibraryAsset }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((index) => {
        const width = 14 - (index % 2) * 3;
        const branchHeight = 64 + index * 8;
        const x = 10 + index * 24;
        const rotate = -26 + index * 12;
        return (
          <span
            key={`${props.asset.id}-branch-${index}`}
            className="absolute bottom-0 rounded-full"
            style={{
              left: x,
              width,
              height: branchHeight,
              transform: `rotate(${rotate}deg)`,
              transformOrigin: "center bottom",
              background: `linear-gradient(180deg, ${props.asset.colorB}, ${props.asset.colorA})`,
              boxShadow: "inset -2px -6px 8px rgba(0,0,0,0.18)",
            }}
          />
        );
      })}
    </>
  );
}

export function CanvasItemSprite(props: CanvasItemSpriteProps) {
  const variantSize = spriteSizeForVariant(props.asset);
  const style: CSSProperties = {
    width: Math.round(variantSize.width * props.scale),
    height: Math.round(variantSize.height * props.scale),
  };

  return (
    <span className="pointer-events-none relative block" style={style}>
      {props.asset.variant === "rosette" ? <LeafCluster asset={props.asset} /> : null}
      {props.asset.variant === "stem" ? <StemCluster asset={props.asset} /> : null}
      {props.asset.variant === "carpet" ? <CarpetCluster asset={props.asset} /> : null}
      {props.asset.variant === "rock" ? <RockCluster asset={props.asset} /> : null}
      {props.asset.variant === "wood" ? <WoodCluster asset={props.asset} /> : null}
    </span>
  );
}
