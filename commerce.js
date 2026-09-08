(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const names = ['Scott', 'Yuki', '小文', '阿哲', 'Mia', 'Ben', 'Cora'];
  let members = [{ id: 'member-1', name: 'Scott', initial: 'S', purchased: false }];
  let pending = false;
  let timer;
  let previousBuyers = 0;
  const dialog = $('#invite-dialog');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const initial = (name) => /[a-z]/i.test(name[0]) ? name[0].toUpperCase() : name.slice(-1);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function render(newMember = false) {
    const count = members.filter(member => member.purchased).length;
    $('#member-count').textContent = members.length;
    $('#offer-count').textContent = `${count} 人已購`;
    $('#purchase-summary').textContent = `${count} 人購買 / ${members.length} 人共編`;
    $('#coedit-avatars').replaceChildren();
    members.slice(0, 5).forEach((member, index) => {
      const avatar = el('span', `avatar${index === 0 ? ' solid' : ''}${newMember && index === members.length - 1 ? ' just-joined' : ''}`, member.initial);
      avatar.setAttribute('aria-label', `${member.name} 已加入共編`);
      avatar.title = member.name;
      $('#coedit-avatars').append(avatar);
    });
    if (members.length > 5) $('#coedit-avatars').append(el('span', 'avatar more-members', `+${members.length - 5}`));
    $('#deal-progress-fill').style.width = `${Math.min(count, 4) * 25}%`;
    $('.purchase-progress').setAttribute('aria-valuenow', Math.min(count, 4));
    $('.purchase-progress').setAttribute('aria-valuetext', `${count} 人已購買，4 人解鎖最高福利`);
    document.querySelectorAll('.offer-tiers .reward').forEach(reward => {
      const threshold = Number(reward.dataset.level);
      const unlocked = count >= threshold;
      reward.classList.toggle('unlocked', unlocked);
      reward.classList.remove('just-unlocked');
      if (count > previousBuyers && count === threshold) {
        void reward.offsetWidth;
        reward.classList.add('just-unlocked');
      }
      reward.querySelector('.reward-state').textContent = unlocked ? '✓ 已解鎖' : '待解鎖';
    });
    const captions = ['第 2 位購買，就有第一份福利。', '再 1 人購買，兩位都多 500MB。', '再 1 人購買，每位再拿 30 chicCoin。', '再 1 人購買，一起解鎖旅伴價。'];
    $('#progress-label').textContent = count < 4 ? captions[count] : `${count} 位購買者，已解鎖最高福利。`;
    $('#deal-status').textContent = count >= 4 ? '✓ 已購旅伴共享：500MB ＋ 30 chicCoin ＋ 旅伴價。' : count >= 2 ? `✓ ${count} 位購買者已解鎖福利；其他朋友仍可自由共編。` : '加入共編不會觸發優惠，購買 eSIM 才會累計。';
    $('#purchase-members').replaceChildren();
    members.forEach(member => {
      const row = el('div', `purchase-member${member.purchased ? ' has-order' : ''}`);
      row.append(el('span', 'avatar', member.initial));
      const copy = el('span', 'purchase-member-copy');
      copy.append(el('strong', '', member.name));
      copy.append(el('small', '', member.purchased ? (count >= 4 ? '已購 · 最高福利' : count >= 2 ? '已購 · 福利已升級' : '已購 · 等待旅伴') : '可共同編輯 · 尚未購買'));
      row.append(copy);
      const button = el('button', member.purchased ? 'order-undo' : 'order-buy', member.purchased ? '撤銷模擬' : '模擬購買');
      button.dataset.member = member.id;
      button.setAttribute('aria-label', `${member.purchased ? '撤銷' : '模擬'} ${member.name} ${member.purchased ? '的模擬訂單' : '購買 eSIM'}`);
      row.append(button);
      $('#purchase-members').append(row);
    });
    $('#invite-from-trip').disabled = pending;
    const newest = members[members.length - 1];
    $('#coedit-status').replaceChildren(el('span', 'mini-avatar', newest.initial), document.createTextNode(members.length === 1 ? 'Scott 正在規劃行程。邀朋友一起加景點，購買由每個人自己決定。' : `${newest.name} 已加入共同編輯。共 ${members.length} 人共編，${count} 人選購 eSIM。`));
    previousBuyers = count;
  }

  $('#purchase-members').addEventListener('click', event => {
    const button = event.target.closest('button[data-member]');
    if (!button) return;
    const member = members.find(item => item.id === button.dataset.member);
    if (!member) return;
    member.purchased = !member.purchased;
    render();
    $('#purchase-members').querySelector(`[data-member="${member.id}"]`).focus({ preventScroll: true });
  });
  $('#invite-from-trip').addEventListener('click', () => {
    if (pending) return;
    $('#invite-name').value = names[members.length] || `旅伴 ${members.length + 1}`;
    updateInvite();
    dialog.showModal();
  });
  function updateInvite() {
    const name = $('#invite-name').value.trim();
    $('#invite-avatar').textContent = name ? initial(name) : '+';
    $('#accept-invite').textContent = `模擬 ${name || '旅伴'} 接受邀請 →`;
    $('#accept-invite').disabled = !name || pending;
  }
  $('#invite-name').addEventListener('input', updateInvite);
  function cancelInvite() {
    clearTimeout(timer);
    pending = false;
    $('#invite-name').disabled = false;
    updateInvite();
    $('#invite-from-trip').disabled = false;
  }
  dialog.addEventListener('cancel', cancelInvite);
  dialog.addEventListener('close', cancelInvite);
  $('#accept-invite').addEventListener('click', () => {
    const name = $('#invite-name').value.trim();
    if (pending || !name) return;
    pending = true;
    $('#accept-invite').disabled = true;
    $('#invite-name').disabled = true;
    $('#accept-invite').textContent = `${name} 正在加入…`;
    timer = setTimeout(() => {
      members.push({ id: `member-${members.length + 1}`, name, initial: initial(name), purchased: false });
      pending = false;
      $('#invite-name').disabled = false;
      dialog.close();
      render(true);
    }, reduced.matches ? 0 : 360);
  });
  window.GroupDeal = {
    getMembers: () => members.map(member => ({ ...member })),
    reset() {
      cancelInvite();
      dialog.close();
      members = [{ id: 'member-1', name: 'Scott', initial: 'S', purchased: false }];
      previousBuyers = 0;
      $('#esim-offer').open = false;
      render();
    }
  };
  render();
})();
