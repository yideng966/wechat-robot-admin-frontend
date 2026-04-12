import { Image, theme } from 'antd';
import { XMLParser } from 'fast-xml-parser';
import React from 'react';
import type { Api } from '@/api/wechat-robot/wechat-robot';
import { AppMessageTypeMap, ImageFallback, MessageTypeMap } from '@/constant';
import type { AppMessageType } from '@/constant/types';
import { MessageType } from '@/constant/types';

interface IProps {
	robotId: number;
	message: Api.V1ChatHistoryList.ResponseBody['data']['items'][number];
	chatRoomMembers?: Record<string, string>;
}

const MessageContent = (props: IProps) => {
	const { token } = theme.useToken();

	const msgType = props.message.type as MessageType;
	const subType = props.message.app_msg_type as AppMessageType;

	if (props.message.is_group && props.message.from_wxid === props.message.sender_wxid) {
		return '[群系统消息]';
	}

	switch (msgType) {
		case MessageType.Text:
			return <pre className="text-message">{props.message.content}</pre>;
		case MessageType.Image:
			if (props.message.attachment_url) {
				return (
					<Image
						styles={{
							image: {
								maxHeight: 300,
								width: 'auto',
								maxWidth: '100%',
							},
						}}
						src={props.message.attachment_url}
						alt={props.message.display_full_content || '图片消息'}
						preview={{
							mask: true,
							cover: '点击查看大图',
						}}
						fallback={ImageFallback}
					/>
				);
			}
			return (
				<Image
					styles={{
						image: {
							maxHeight: 300,
							width: 'auto',
							maxWidth: '100%',
						},
					}}
					src={`/api/v1/chat/image/download?id=${props.robotId}&message_id=${props.message.id}`}
					alt={props.message.display_full_content || '图片消息'}
					preview={{
						mask: true,
						cover: '点击查看大图',
					}}
					fallback={ImageFallback}
				/>
			);
		case MessageType.Voice:
			return (
				<audio
					controls
					src={`/api/v1/chat/voice/download?id=${props.robotId}&message_id=${props.message.id}`}
				/>
			);
		case MessageType.Emoticon: {
			if (!props.message.content) {
				return '[表情消息] 异常';
			}
			const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
			const jsonObj = parser.parse(props.message.content) as {
				msg: {
					emoji: {
						cdnurl: string;
					};
				};
			};
			if (jsonObj.msg && jsonObj.msg.emoji && jsonObj.msg.emoji.cdnurl) {
				return (
					<img
						src={jsonObj.msg.emoji.cdnurl}
						alt="[表情消息]"
						style={{ maxWidth: 200, maxHeight: 200 }}
					/>
				);
			}
			return '[表情消息] 异常';
		}
		case MessageType.App: {
			if (props.message.display_full_content) {
				return props.message.display_full_content;
			}
			return `[${AppMessageTypeMap[subType] || '未知消息'}]`;
		}
		case MessageType.Sysmsg: {
			if (props.message.display_full_content) {
				return props.message.display_full_content;
			}
			if (!props.message.content) {
				return '[未知消息]';
			}
			try {
				const parser = new XMLParser();
				const jsonObj = parser.parse(props.message.content);
				if ('sysmsg' in jsonObj && typeof jsonObj.sysmsg === 'object') {
					if ('pat' in jsonObj.sysmsg) {
						const pat = jsonObj.sysmsg.pat as {
							fromusername: string;
							pattedusername: string;
							patsuffix: string;
						};
						return `"${props.chatRoomMembers?.[pat.fromusername] || pat.fromusername}" 拍了拍 "${props.chatRoomMembers?.[pat.pattedusername] || pat.pattedusername}" ${pat.patsuffix}`;
					}
					if ('revokemsg' in jsonObj.sysmsg) {
						const revokemsg = jsonObj.sysmsg.revokemsg as {
							session: string;
							replacemsg: string;
						};
						return revokemsg.replacemsg || '[消息已撤回]';
					}
					if ('secmsg' in jsonObj.sysmsg) {
						return <span style={{ color: token.colorWarning }}>[微信内部风控/展示元数据通知]</span>;
					}
				}
				return '[未知消息]';
			} catch {
				return '[未知消息]';
			}
		}
		default: {
			if (props.message.display_full_content) {
				return props.message.display_full_content;
			}
			return `[${MessageTypeMap[msgType] || '未知消息'}]`;
		}
	}
};

export default React.memo(MessageContent);
