function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isComandante(value) {
  const v = normalizeKey(value);
  return ["sim", "s", "yes", "y", "true", "1"].includes(v) || v.startsWith("sim");
}

function resolvePatente(config, patenteKey) {
  const patentes = config.onApprove?.patentes || {};
  return patentes[patenteKey] ? { key: patenteKey, ...patentes[patenteKey] } : null;
}

function matchPatenteFromQra(config, qra) {
  const text = normalizeKey(qra);
  const patentes = config.onApprove?.patentes || {};
  const sorted = Object.entries(patentes).sort(
    (a, b) => (b[1].label?.length || 0) - (a[1].label?.length || 0)
  );

  for (const [key, item] of sorted) {
    const label = normalizeKey(item.label);
    if (label && text.includes(label)) return { key, ...item };
  }
  return null;
}

function buildNickname(config, data) {
  const nome = String(data.nomeCompleto || data.qra || "").trim();
  if (!nome) return "";

  let insignia = String(data.patenteInsignia || "").trim();

  if (!insignia && data.patenteKey) {
    const patente = resolvePatente(config, data.patenteKey);
    insignia = patente?.insignia || "";
  }

  if (!insignia) return nome.slice(0, 32);

  return `${insignia} ${nome}`.replace(/\s+/g, " ").trim().slice(0, 32);
}

async function addRolesSafely(member, roleIds, reason, changes) {
  const guild = member.guild;
  const uniqueIds = [...new Set(roleIds.filter(Boolean))];

  const resolved = await Promise.all(
    uniqueIds.map(async (id) => guild.roles.fetch(id).catch(() => null))
  );

  const missing = uniqueIds.filter((id) => !resolved.some((r) => r?.id === id));
  if (missing.length) {
    changes.push(`- Cargo(s) não encontrado(s): ${missing.map((id) => `\`${id}\``).join(", ")}`);
  }

  const addable = resolved.filter((r) => r && r.editable);
  const blocked = resolved.filter((r) => r && !r.editable);

  if (blocked.length) {
    changes.push(
      `- Cargo(s) bloqueado(s) para o bot: ${blocked.map((r) => `@${r.name}`).join(", ")}`
    );
  }

  if (!addable.length) return;

  try {
    await member.roles.add(
      addable.map((r) => r.id),
      reason
    );
    changes.push(`- Cargos adicionados: ${addable.map((r) => `@${r.name}`).join(", ")}`);
  } catch (err) {
    if (err?.code === 50013) {
      changes.push("- Missing Permissions ao adicionar cargos (hierarquia/permissão).");
    } else {
      throw err;
    }
  }
}

async function applyCadastrarBpmApproval(member, config, data, guild) {
  const {
    getOrCreateBattalionRole,
    resolveChannelCategory,
    createBattalionChannel
  } = require("./battalion");

  const changes = [];
  const onApprove = config.onApprove || {};
  const roleIds = [];

  if (onApprove.policiaRoleId) {
    roleIds.push(onApprove.policiaRoleId);
  } else {
    changes.push("- `policiaRoleId` não configurado.");
  }

  const { role: batalhaoRole, created: roleCreated, error: roleError } = await getOrCreateBattalionRole(
    guild,
    data.nomeEstado,
    config
  );

  if (batalhaoRole) {
    roleIds.push(batalhaoRole.id);
    changes.push(
      roleCreated
        ? `- Cargo do batalhão **criado**: @${batalhaoRole.name}`
        : `- Cargo do batalhão **existente**: @${batalhaoRole.name}`
    );
  } else if (roleError) {
    changes.push(`- Cargo do batalhão: ${roleError}`);
  }

  if (isComandante(data.comandante)) {
    if (onApprove.comandoBatalhaoRoleId) {
      roleIds.push(onApprove.comandoBatalhaoRoleId);
    } else {
      changes.push("- Comandante SIM, mas `comandoBatalhaoRoleId` não configurado.");
    }
  }

  await addRolesSafely(member, roleIds, "BPM: aprovação de cadastro", changes);

  if (data.qra || data.nomeCompleto || data.patenteKey || data.patenteInsignia) {
    const nickname = buildNickname(config, data);
    if (nickname) {
      try {
        await member.setNickname(nickname, "BPM: aprovação — insignia/nome");
        changes.push(`- Apelido: \`${nickname}\``);
      } catch (err) {
        if (err?.code === 50013) {
          changes.push("- Sem permissão/hierarquia para alterar apelido.");
        } else {
          changes.push("- Erro ao alterar apelido.");
        }
      }
    }
  }

  const { category, changes: catChanges } = await resolveChannelCategory(guild, data, config);
  changes.push(...catChanges);

  let createdChannel = null;
  if (category) {
    try {
      createdChannel = await createBattalionChannel(guild, config, data, category, batalhaoRole, member);
      changes.push(
        `- Canal **#${createdChannel.name}** criado em **${category.name}**`
      );
    } catch (err) {
      changes.push(`- Erro ao criar canal: ${err?.message || "permissão/hierarquia"}`);
    }
  }

  return { changes, createdChannel, batalhaoRole };
}

module.exports = {
  isComandante,
  buildNickname,
  resolvePatente,
  matchPatenteFromQra,
  applyCadastrarBpmApproval,
  addRolesSafely
};
