export const PROJECTS: Record<string, string> = {
  reba: "РЕБА.РФ",
  addict: "addict+clinic",
};

export const projectKey = (r: { project_key?: string | null; project?: string | null }) =>
  (r.project_key || r.project) === "reba" ? "reba" : "addict";

export const ProjectIcon = ({ project, size = 20 }: { project: string; size?: number }) => {
  const reba = project === "reba";
  return (
    <span
      title={PROJECTS[reba ? "reba" : "addict"]}
      aria-label={PROJECTS[reba ? "reba" : "addict"]}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold leading-none"
      style={{ width: size, height: size, fontSize: size * (reba ? 0.55 : 0.8), background: reba ? "#C9C868" : "#E02B2F", color: reba ? "#1B1B1A" : "#FFFFFF" }}
    >
      {reba ? "Р" : "+"}
    </span>
  );
};

const ProjectBadge = ({ row, withLabel = true, size = 20 }: { row: any; withLabel?: boolean; size?: number }) => {
  const p = projectKey(row);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <ProjectIcon project={p} size={size} />
      {withLabel && <span>{PROJECTS[p]}</span>}
    </span>
  );
};

export default ProjectBadge;
