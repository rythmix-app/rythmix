import React from "react";
import Svg, { Path, G, Line } from "react-native-svg";

export type IconlyIconProps = {
  size?: number;
  color?: string;
};

export const IconlyHome = ({
  size = 24,
  color = "#000000",
}: IconlyIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.07874 16.1354H14.8937"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.40002 13.713C2.40002 8.082 3.01402 8.475 6.31902 5.41C7.76502 4.246 10.015 2 11.958 2C13.9 2 16.195 4.235 17.654 5.41C20.959 8.475 21.572 8.082 21.572 13.713C21.572 22 19.613 22 11.986 22C4.35903 22 2.40002 22 2.40002 13.713Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconlyHeart = ({
  size = 24,
  color = "#000000",
}: IconlyIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <G transform="translate(2.5, 3)">
        <Path d="M0.371865331,8.59832177 C-0.701134669,5.24832177 0.552865331,1.41932177 4.06986533,0.28632177 C5.91986533,-0.31067823 7.96186533,0.0413217701 9.49986533,1.19832177 C10.9548653,0.0733217701 13.0718653,-0.30667823 14.9198653,0.28632177 C18.4368653,1.41932177 19.6988653,5.24832177 18.6268653,8.59832177 C16.9568653,13.9083218 9.49986533,17.9983218 9.49986533,17.9983218 C9.49986533,17.9983218 2.09786533,13.9703218 0.371865331,8.59832177 Z" />
        <Path d="M13.5,3.7 C14.57,4.046 15.326,5.001 15.417,6.122" />
      </G>
    </G>
  </Svg>
);

export const IconlyGame = ({
  size = 24,
  color = "#000000",
}: IconlyIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <G transform="translate(2, 2)">
        <Line x1="6.84825686" y1="10.3140022" x2="6.84825686" y2="14.0589969" />
        <Line x1="8.75903359" y1="12.1867073" x2="4.93790399" y2="12.1867073" />
        <Line x1="13.3661121" y1="10.4280345" x2="13.2590866" y2="10.4280345" />
        <Line x1="15.1796122" y1="14.0026039" x2="15.0725866" y2="14.0026039" />
        <Path d="M6.07216276,0 L6.07216276,0 C6.07216276,0.740482877 6.68464554,1.34076212 7.44018226,1.34076212 L8.49666207,1.34076212 C9.66228674,1.34491631 10.6064427,2.27026027 10.611741,3.41266022 L10.611741,4.08771473" />
        <Path d="M14.4283141,19.9626083 C11.4231218,20.013497 8.47303168,20.0114199 5.57274558,19.9626083 C2.35350217,19.9626083 0,17.6663844 0,14.5112835 L0,9.86171565 C0,6.70661469 2.35350217,4.41039079 5.57274558,4.41039079 C8.48892657,4.36054061 11.441136,4.36157916 14.4283141,4.41039079 C17.6475575,4.41039079 20,6.70765324 20,9.86171565 L20,14.5112835 C20,17.6663844 17.6475575,19.9626083 14.4283141,19.9626083 Z" />
      </G>
    </G>
  </Svg>
);

export const IconlyProfile = ({
  size = 24,
  color = "#000000",
}: IconlyIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.8445 21.6619C8.15273 21.6619 5 21.0874 5 18.7867C5 16.4859 8.13273 14.3619 11.8445 14.3619C15.5364 14.3619 18.6891 16.4653 18.6891 18.7661C18.6891 21.0659 15.5564 21.6619 11.8445 21.6619Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.8372 11.1737C14.26 11.1737 16.2236 9.21002 16.2236 6.7873C16.2236 4.36457 14.26 2.40002 11.8372 2.40002C9.41452 2.40002 7.44998 4.36457 7.44998 6.7873C7.4418 9.20184 9.3918 11.1655 11.8063 11.1737C11.8172 11.1737 11.8272 11.1737 11.8372 11.1737Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
