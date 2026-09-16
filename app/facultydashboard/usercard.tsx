import { Pencil, Trash2 } from "lucide-react";

interface UserCardProps {
  name: string;
  facultyId: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function UserCard({
  name,
  facultyId,
  onEdit,
  onDelete,
}: UserCardProps) {
  return (
    <div
      className="
        w-full
        bg-white
        border border-gray-200
        rounded-xl
        shadow-md
        p-3
        sm:p-4
        flex
        flex-col
        min-[400px]:flex-row
        items-start
        min-[400px]:items-center
        justify-between
        gap-3
        min-w-0
      "
    >
      {/* User Information */}
      <div className="min-w-0 flex-1 w-full">
        <h2
          className="
            text-[#1E293B]
            font-semibold
            text-base
            sm:text-lg
            truncate
          "
          title={name}
        >
          {name}
        </h2>

        <p
          className="
            text-gray-500
            text-xs
            sm:text-sm
            truncate
            mt-0.5
          "
          title={facultyId}
        >
          {facultyId}
        </p>
      </div>

      {/* Action Buttons */}
      <div
        className="
          flex
          items-center
          gap-2
          w-full
          min-[400px]:w-auto
          shrink-0
        "
      >
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit user"
          className="
            flex-1
            min-[400px]:flex-none
            p-2
            min-[400px]:p-2
            bg-blue-100
            hover:bg-blue-200
            active:bg-blue-300
            rounded-lg
            transition
            flex
            items-center
            justify-center
          "
        >
          <Pencil
            size={17}
            className="text-blue-600"
          />
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete user"
          className="
            flex-1
            min-[400px]:flex-none
            p-2
            min-[400px]:p-2
            bg-red-100
            hover:bg-red-200
            active:bg-red-300
            rounded-lg
            transition
            flex
            items-center
            justify-center
          "
        >
          <Trash2
            size={17}
            className="text-red-600"
          />
        </button>
      </div>
    </div>
  );
}