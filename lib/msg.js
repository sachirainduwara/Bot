const { proto, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys')
const fs = require('fs')

const downloadMediaMessage = async(m, filename) => {
	if (m.type === 'viewOnceMessage') {
		m.type = m.msg.type
	}
	if (m.type === 'imageMessage') {
		var nameJpg = filename ? filename + '.jpg' : 'undefined.jpg'
		const stream = await downloadContentFromMessage(m.msg, 'image')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameJpg, buffer)
		return fs.readFileSync(nameJpg)
	} else if (m.type === 'videoMessage') {
		var nameMp4 = filename ? filename + '.mp4' : 'undefined.mp4'
		const stream = await downloadContentFromMessage(m.msg, 'video')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameMp4, buffer)
		return fs.readFileSync(nameMp4)
	} else if (m.type === 'audioMessage') {
		var nameMp3 = filename ? filename + '.mp3' : 'undefined.mp3'
		const stream = await downloadContentFromMessage(m.msg, 'audio')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameMp3, buffer)
		return fs.readFileSync(nameMp3)
	} else if (m.type === 'stickerMessage') {
		var nameWebp = filename ? filename + '.webp' : 'undefined.webp'
		const stream = await downloadContentFromMessage(m.msg, 'sticker')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameWebp, buffer)
		return fs.readFileSync(nameWebp)
	} else if (m.type === 'documentMessage') {
		var ext = m.msg.fileName.split('.')[1].toLowerCase().replace('jpeg', 'jpg').replace('png', 'jpg').replace('m4a', 'mp3')
		var nameDoc = filename ? filename + '.' + ext : 'undefined.' + ext
		const stream = await downloadContentFromMessage(m.msg, 'document')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameDoc, buffer)
		return fs.readFileSync(nameDoc)
	}
}

const sms = (danuwa, m) => {
	if (m.key) {
		m.id = m.key.id
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isGroup = m.chat.endsWith('@g.us')
		m.sender = m.fromMe ? danuwa.user.id.split(':')[0]+'@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
	}
	if (m.message) {
		m.type = getContentType(m.message)
		m.msg = (m.type === 'viewOnceMessage') ? m.message[m.type].message[getContentType(m.message[m.type].message)] : m.message[m.type]
		
		// Unpack Ephemeral or ViewOnce safely if nested further
		if (m.msg && m.msg.message) {
			let innerType = getContentType(m.msg.message)
			if (innerType) {
				m.type = innerType
				m.msg = m.msg.message[innerType]
			}
		}

		if (m.msg) {
			if (m.type === 'viewOnceMessage') {
				m.msg.type = getContentType(m.message[m.type].message)
			}
			var quotedMention = m.msg.contextInfo != null ? m.msg.contextInfo.participant : ''
			var tagMention = m.msg.contextInfo != null ? m.msg.contextInfo.mentionedJid : []
			var mention = typeof(tagMention) == 'string' ? [tagMention] : tagMention
			mention != undefined ? mention.push(quotedMention) : []
			m.mentionUser = mention != undefined ? mention.filter(x => x) : []
			
			// 100% Robust Body Extractor for both Inbox and Groups
			let extractedBody = '';
			if (typeof m.msg === 'string') {
				extractedBody = m.msg;
			} else if (m.text) {
				extractedBody = m.text;
			} else if (m.msg.text) {
				extractedBody = m.msg.text;
			} else if (m.msg.conversation) {
				extractedBody = m.msg.conversation;
			} else if (m.msg.caption) {
				extractedBody = m.msg.caption;
			} else if (m.type === 'extendedTextMessage' && m.msg.text) {
				extractedBody = m.msg.text;
			} else if (m.type === 'templateButtonReplyMessage' && m.msg.selectedId) {
				extractedBody = m.msg.selectedId;
			} else if (m.type === 'buttonsResponseMessage' && m.msg.selectedButtonId) {
				extractedBody = m.msg.selectedButtonId;
			} else if (m.type === 'listResponseMessage' && m.msg.singleSelectReply?.selectedRowId) {
				extractedBody = m.msg.singleSelectReply.selectedRowId;
			}
			m.body = extractedBody ? String(extractedBody) : '';

			m.quoted = m.msg.contextInfo != undefined ? m.msg.contextInfo.quotedMessage : null
			if (m.quoted) {
				m.quoted.type = getContentType(m.quoted)
				m.quoted.id = m.msg.contextInfo.stanzaId
				m.quoted.sender = m.msg.contextInfo.participant
				m.quoted.fromMe = m.quoted.sender.split('@')[0].includes(danuwa.user.id.split(':')[0])
				m.quoted.msg = (m.quoted.type === 'viewOnceMessage') ? m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] : m.quoted[m.quoted.type]
				if (m.quoted.type === 'viewOnceMessage') {
					m.quoted.msg.type = getContentType(m.quoted[m.quoted.type].message)
				}
				var quoted_quotedMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.participant : ''
				var quoted_tagMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.mentionedJid : []
				var quoted_mention = typeof(quoted_tagMention) == 'string' ? [quoted_tagMention] : quoted_tagMention
				quoted_mention != undefined ? quoted_mention.push(quoted_quotedMention) : []
				m.quoted.mentionUser = quoted_mention != undefined ? quoted_mention.filter(x => x) : []
				m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
					key: {
						remoteJid: m.chat,
						fromMe: m.quoted.fromMe,
						id: m.quoted.id,
						participant: m.quoted.sender
					},
					message: m.quoted
				})
				m.quoted.download = (filename) => downloadMediaMessage(m.quoted, filename)
				m.quoted.delete = () => danuwa.sendMessage(m.chat, { delete: m.quoted.fakeObj.key })
				m.quoted.react = (emoji) => danuwa.sendMessage(m.chat, { react: { text: emoji, key: m.quoted.fakeObj.key } })
			}
		}
		m.download = (filename) => downloadMediaMessage(m, filename)
	}
	
	m.reply = (teks, id = m.chat, option = { mentions: [m.sender] }) => danuwa.sendMessage(id, { text: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyS = (stik, id = m.chat, option = { mentions: [m.sender] }) => danuwa.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyImg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => danuwa.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyVid = (vid, teks, id = m.chat, option = { mentions: [m.sender], gif: false }) => danuwa.sendMessage(id, { video: vid, caption: teks, gifPlayback: option.gif, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyAud = (aud, id = m.chat, option = { mentions: [m.sender], ptt: false }) => danuwa.sendMessage(id, { audio: aud, ptt: option.ptt, mimetype: 'audio/mpeg', contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyDoc = (doc, id = m.chat, option = { mentions: [m.sender], filename: 'undefined.pdf', mimetype: 'application/pdf' }) => danuwa.sendMessage(id, { document: doc, mimetype: option.mimetype, fileName: option.filename, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyContact = (name, info, number) => {
		var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
		danuwa.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m })
	}
	m.react = (emoji) => danuwa.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
	
	return m
}

module.exports = { sms, downloadMediaMessage }
