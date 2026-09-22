import { createElement } from "react";
import type { Icon, IconProps, IconWeight } from "@phosphor-icons/react";
import * as P from "@phosphor-icons/react/dist/ssr";

/**
 * Single icon entry point. Uses the hook-free SSR build so the same import works in
 * server and client components, and bakes in one weight so every icon matches.
 */
const WEIGHT: IconWeight = "duotone";

export type IconComponent = ((props: IconProps) => React.JSX.Element) & { displayName?: string };

function icon(Base: Icon, name: string): IconComponent {
  const C: IconComponent = (props) => createElement(Base, { weight: WEIGHT, ...props });
  C.displayName = name;
  return C;
}

export const ArrowCounterClockwise = icon(P.ArrowCounterClockwise, "ArrowCounterClockwise");
export const ArrowDown = icon(P.ArrowDown, "ArrowDown");
export const ArrowLeft = icon(P.ArrowLeft, "ArrowLeft");
export const ArrowRight = icon(P.ArrowRight, "ArrowRight");
export const ArrowSquareOut = icon(P.ArrowSquareOut, "ArrowSquareOut");
export const ArrowUpRight = icon(P.ArrowUpRight, "ArrowUpRight");
export const ArrowsClockwise = icon(P.ArrowsClockwise, "ArrowsClockwise");
export const At = icon(P.At, "At");
export const Bank = icon(P.Bank, "Bank");
export const Broadcast = icon(P.Broadcast, "Broadcast");
export const CalendarBlank = icon(P.CalendarBlank, "CalendarBlank");
export const CalendarDots = icon(P.CalendarDots, "CalendarDots");
export const CalendarPlus = icon(P.CalendarPlus, "CalendarPlus");
export const CalendarX = icon(P.CalendarX, "CalendarX");
export const Camera = icon(P.Camera, "Camera");
export const Car = icon(P.Car, "Car");
export const CaretDown = icon(P.CaretDown, "CaretDown");
export const CaretLeft = icon(P.CaretLeft, "CaretLeft");
export const CaretRight = icon(P.CaretRight, "CaretRight");
export const ChatCircle = icon(P.ChatCircle, "ChatCircle");
export const Check = icon(P.Check, "Check");
export const CheckCircle = icon(P.CheckCircle, "CheckCircle");
export const CircleDashed = icon(P.CircleDashed, "CircleDashed");
export const CircleNotch = icon(P.CircleNotch, "CircleNotch");
export const Clock = icon(P.Clock, "Clock");
export const ClockCounterClockwise = icon(P.ClockCounterClockwise, "ClockCounterClockwise");
export const Coffee = icon(P.Coffee, "Coffee");
export const Columns = icon(P.Columns, "Columns");
export const Copy = icon(P.Copy, "Copy");
export const CreditCard = icon(P.CreditCard, "CreditCard");
export const Envelope = icon(P.Envelope, "Envelope");
export const Eye = icon(P.Eye, "Eye");
export const EyeSlash = icon(P.EyeSlash, "EyeSlash");
export const Gear = icon(P.Gear, "Gear");
export const Globe = icon(P.Globe, "Globe");
export const ImageSquare = icon(P.ImageSquare, "ImageSquare");
export const Info = icon(P.Info, "Info");
export const Key = icon(P.Key, "Key");
export const ListBullets = icon(P.ListBullets, "ListBullets");
export const Lock = icon(P.Lock, "Lock");
export const MagnifyingGlass = icon(P.MagnifyingGlass, "MagnifyingGlass");
export const MapPin = icon(P.MapPin, "MapPin");
export const MapTrifold = icon(P.MapTrifold, "MapTrifold");
export const Money = icon(P.Money, "Money");
export const Moon = icon(P.Moon, "Moon");
export const Note = icon(P.Note, "Note");
export const PaintBrush = icon(P.PaintBrush, "PaintBrush");
export const Palette = icon(P.Palette, "Palette");
export const PawPrint = icon(P.PawPrint, "PawPrint");
export const Pencil = icon(P.Pencil, "Pencil");
export const Phone = icon(P.Phone, "Phone");
export const Plus = icon(P.Plus, "Plus");
export const Receipt = icon(P.Receipt, "Receipt");
export const Scissors = icon(P.Scissors, "Scissors");
export const SealCheck = icon(P.SealCheck, "SealCheck");
export const ShieldCheck = icon(P.ShieldCheck, "ShieldCheck");
export const SignOut = icon(P.SignOut, "SignOut");
export const SquaresFour = icon(P.SquaresFour, "SquaresFour");
export const Star = icon(P.Star, "Star");
export const Sun = icon(P.Sun, "Sun");
export const Toolbox = icon(P.Toolbox, "Toolbox");
export const Trash = icon(P.Trash, "Trash");
export const Tray = icon(P.Tray, "Tray");
export const Users = icon(P.Users, "Users");
export const Wallet = icon(P.Wallet, "Wallet");
export const Warning = icon(P.Warning, "Warning");
export const WarningCircle = icon(P.WarningCircle, "WarningCircle");
export const WifiHigh = icon(P.WifiHigh, "WifiHigh");
export const WifiSlash = icon(P.WifiSlash, "WifiSlash");
export const Wrench = icon(P.Wrench, "Wrench");
export const X = icon(P.X, "X");
export const XCircle = icon(P.XCircle, "XCircle");
export const Tag = icon(P.Tag, "Tag");
