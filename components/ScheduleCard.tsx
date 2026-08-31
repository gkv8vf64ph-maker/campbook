type ScheduleCardProps = {
  time: string;
  title: string;
  description: string;
};

export default function ScheduleCard({
  time,
  title,
  description,
}: ScheduleCardProps) {
  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 mt-1 flex h-10 w-10 items-center justify-center rounded-full border-[6px] border-[#dce5d7] bg-[#52644b] text-white">
        ●
      </div>

      <div className="flex-1 rounded-3xl bg-white p-5 shadow-md">
        <p className="text-sm font-bold text-[#66745f]">
          {time}
        </p>

        <h3 className="mt-1 text-lg font-bold">
          {title}
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}