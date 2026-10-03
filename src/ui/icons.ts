/**
 * Central icon set (lucide-react-native v1 — same family as the web design
 * system). Import icons from here so the whole app shares one vocabulary.
 */
import type { ComponentType } from 'react';

export type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>;

export {
  Activity, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, AtSign, Award, BadgeCheck, Banknote, Bell, BellOff,
  BellRing, BookOpen, Bookmark, BookmarkCheck, Bot, Briefcase, Building2, CalendarCheck, CalendarDays,
  CalendarPlus, Camera, ChartColumn, ChartLine, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CircleAlert, CircleCheck, CircleHelp, CircleUser, CircleX, Clock, Code, Coffee, Coins, Compass,
  Copy, Cpu, Crown, Ellipsis, ExternalLink, Eye, EyeOff, FileText, Flag, Flame, Gift, Globe, GraduationCap,
  Hand, Handshake, Hash, Heart, HeartPulse, History, House, Image as ImageIcon, ImagePlus, Inbox, Info,
  KeyRound, Landmark, Laptop, LayoutGrid, Leaf, LifeBuoy, Lightbulb, Link, ListFilter, Lock, LogOut, Mail,
  MapPin, Medal, Megaphone, MessageCircle, MessagesSquare, Mic, Minus, Moon, Network, Newspaper, Palette,
  Paperclip, PenLine, Phone, Pin, Plus, Presentation, Quote, Radar, RefreshCw, Repeat2, Rocket, RotateCcw,
  Scale, ScrollText, Search, Send, Settings, Share, Share2, Shield, ShieldCheck, ShoppingBag, SlidersHorizontal,
  Smartphone, Sparkles, SquarePen, Star, Store, Sun, SunMoon, Target, Ticket, Timer, Trash2, TrendingUp,
  TriangleAlert, Trophy, Upload, User, UserCheck, UserPlus, Users, UsersRound, Vibrate, Video, Vote, Wallet,
  WandSparkles, X, Zap,
} from 'lucide-react-native';
