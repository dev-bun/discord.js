import type { JSONEncodable } from '@discordjs/util';
import type { APIEmbed, APIEmbedAuthor, APIEmbedField, APIEmbedFooter } from 'discord-api-types/v10';
import type { RestOrArray } from '../../util/normalizeArray.js';
import { normalizeArray } from '../../util/normalizeArray.js';
import { isValidationEnabled } from '../../util/validation.js';
import { embedPredicate } from './Assertions.js';
import { EmbedAuthorBuilder } from './EmbedAuthor.js';
import { EmbedFieldBuilder } from './EmbedField.js';
import { EmbedFooterBuilder } from './EmbedFooter.js';

/**
 * Data stored in the process of constructing an embed.
 */
export interface EmbedBuilderData extends Omit<APIEmbed, 'author' | 'fields' | 'footer'> {
	author?: EmbedAuthorBuilder;
	fields?: EmbedFieldBuilder[];
	footer?: EmbedFooterBuilder;
}

/**
 * A builder that creates API-compatible JSON data for embeds.
 */
export class EmbedBuilder implements JSONEncodable<APIEmbed> {
	/**
	 * The API data associated with this embed.
	 */
	private readonly data: EmbedBuilderData;

	/**
	 * Gets the author of this embed.
	 */
	public get author(): EmbedAuthorBuilder {
		return (this.data.author ??= new EmbedAuthorBuilder());
	}

	/**
	 * Gets the fields of this embed.
	 */
	public get fields(): readonly EmbedFieldBuilder[] {
		return (this.data.fields ??= []);
	}

	/**
	 * Gets the footer of this embed.
	 */
	public get footer(): EmbedFooterBuilder {
		return (this.data.footer ??= new EmbedFooterBuilder());
	}

	/**
	 * Creates a new embed from API data.
	 *
	 * @param data - The API data to create this embed with
	 */
	public constructor(data: APIEmbed = {}) {
		this.data = {
			...structuredClone(data),
			author: data.author ? new EmbedAuthorBuilder(data.author) : undefined,
			fields: data.fields?.map((field) => new EmbedFieldBuilder(field)),
			footer: data.footer ? new EmbedFooterBuilder(data.footer) : undefined,
		};
	}

	/**
	 * Appends fields to the embed.
	 *
	 * @remarks
	 * This method accepts either an array of fields or a variable number of field parameters.
	 * The maximum amount of fields that can be added is 25.
	 * @example
	 * Using an array:
	 * ```ts
	 * const fields: APIEmbedField[] = ...;
	 * const embed = new EmbedBuilder()
	 * 	.addFields(fields);
	 * ```
	 * @example
	 * Using rest parameters (variadic):
	 * ```ts
	 * const embed = new EmbedBuilder()
	 * 	.addFields(
	 * 		{ name: 'Field 1', value: 'Value 1' },
	 * 		{ name: 'Field 2', value: 'Value 2' },
	 * 	);
	 * ```
	 * @param fields - The fields to add
	 */
	public addFields(
		...fields: RestOrArray<APIEmbedField | EmbedFieldBuilder | ((builder: EmbedFieldBuilder) => EmbedFieldBuilder)>
	): this {
		const normalizedFields = normalizeArray(fields);
		const resolved = normalizedFields.map((field) => {
			if (field instanceof EmbedFieldBuilder) {
				return field;
			}

			if (typeof field === 'function') {
				return field(new EmbedFieldBuilder());
			}

			return new EmbedFieldBuilder(field);
		});

		this.data.fields ??= [];
		this.data.fields.push(...resolved);

		return this;
	}

	/**
	 * Removes, replaces, or inserts fields for this embed.
	 *
	 * @remarks
	 * This method behaves similarly
	 * to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice | Array.prototype.splice()}.
	 * The maximum amount of fields that can be added is 25.
	 *
	 * It's useful for modifying and adjusting order of the already-existing fields of an embed.
	 * @example
	 * Remove the first field:
	 * ```ts
	 * embed.spliceFields(0, 1);
	 * ```
	 * @example
	 * Remove the first n fields:
	 * ```ts
	 * const n = 4;
	 * embed.spliceFields(0, n);
	 * ```
	 * @example
	 * Remove the last field:
	 * ```ts
	 * embed.spliceFields(-1, 1);
	 * ```
	 * @param index - The index to start at
	 * @param deleteCount - The number of fields to remove
	 * @param fields - The replacing field objects
	 */
	public spliceFields(
		index: number,
		deleteCount: number,
		...fields: (APIEmbedField | EmbedFieldBuilder | ((builder: EmbedFieldBuilder) => EmbedFieldBuilder))[]
	): this {
		const resolved = fields.map((field) => {
			if (field instanceof EmbedFieldBuilder) {
				return field;
			}

			if (typeof field === 'function') {
				return field(new EmbedFieldBuilder());
			}

			return new EmbedFieldBuilder(field);
		});

		this.data.fields ??= [];
		this.data.fields.splice(index, deleteCount, ...resolved);

		return this;
	}

	/**
	 * Sets the fields for this embed.
	 *
	 * @remarks
	 * This method is an alias for {@link EmbedBuilder.spliceFields}. More specifically,
	 * it splices the entire array of fields, replacing them with the provided fields.
	 *
	 * You can set a maximum of 25 fields.
	 * @param fields - The fields to set
	 */
	public setFields(
		...fields: RestOrArray<APIEmbedField | EmbedFieldBuilder | ((builder: EmbedFieldBuilder) => EmbedFieldBuilder)>
	): this {
		this.spliceFields(0, this.data.fields?.length ?? 0, ...normalizeArray(fields));
		return this;
	}

	/**
	 * Sets the author of this embed.
	 *
	 * @param options - The options to use
	 */
	public setAuthor(
		options: APIEmbedAuthor | EmbedAuthorBuilder | ((builder: EmbedAuthorBuilder) => EmbedAuthorBuilder),
	): this {
		if (options instanceof EmbedAuthorBuilder) {
			this.data.author = options;
		} else if (typeof options === 'function') {
			this.data.author = options(new EmbedAuthorBuilder());
		} else {
			this.data.author = new EmbedAuthorBuilder(options);
		}

		return this;
	}

	/**
	 * Clears the author of this embed.
	 */
	public clearAuthor(): this {
		this.data.author = undefined;
		return this;
	}

	/**
	 * Sets the color of this embed.
	 *
	 * @param color - The color to use
	 */
	public setColor(color: number): this {
		this.data.color = color;
		return this;
	}

	public clearColor(): this {
		this.data.color = undefined;
		return this;
	}

	/**
	 * Sets the description of this embed.
	 *
	 * @param description - The description to use
	 */
	public setDescription(description: string): this {
		this.data.description = description;
		return this;
	}

	public clearDescription(): this {
		this.data.description = undefined;
		return this;
	}

	/**
	 * Sets the footer of this embed.
	 *
	 * @param options - The footer to use
	 */
	public setFooter(
		options: APIEmbedFooter | EmbedFooterBuilder | ((builder: EmbedFooterBuilder) => EmbedFooterBuilder),
	): this {
		if (options instanceof EmbedFooterBuilder) {
			this.data.footer = options;
		} else if (typeof options === 'function') {
			this.data.footer = options(new EmbedFooterBuilder());
		} else {
			this.data.footer = new EmbedFooterBuilder(options);
		}

		return this;
	}

	/**
	 * Clears the footer of this embed.
	 */
	public clearFooter(): this {
		this.data.footer = undefined;
		return this;
	}

	/**
	 * Sets the image of this embed.
	 *
	 * @param url - The image URL to use
	 */
	public setImage(url: string | null): this {
		this.data.image = url ? { url } : undefined;
		return this;
	}

	/**
	 * Clears the image of this embed.
	 */
	public clearImage(): this {
		this.data.image = undefined;
		return this;
	}

	/**
	 * Sets the thumbnail of this embed.
	 *
	 * @param url - The thumbnail URL to use
	 */
	public setThumbnail(url: string | null): this {
		this.data.thumbnail = url ? { url } : undefined;
		return this;
	}

	/**
	 * Clears the thumbnail of this embed.
	 */
	public clearThumbnail(): this {
		this.data.thumbnail = undefined;
		return this;
	}

	/**
	 * Sets the timestamp of this embed.
	 *
	 * @param timestamp - The timestamp or date to use
	 */
	public setTimestamp(timestamp: Date | number | string = Date.now()): this {
		this.data.timestamp = new Date(timestamp).toISOString();
		return this;
	}

	/**
	 * Clears the timestamp of this embed.
	 */
	public clearTimestamp(): this {
		this.data.timestamp = undefined;
		return this;
	}

	/**
	 * Sets the title for this embed.
	 *
	 * @param title - The title to use
	 */
	public setTitle(title: string): this {
		this.data.title = title;
		return this;
	}

	/**
	 * Clears the title of this embed.
	 */
	public clearTitle(): this {
		this.data.title = undefined;
		return this;
	}

	/**
	 * Sets the URL of this embed.
	 *
	 * @param url - The URL to use
	 */
	public setURL(url: string): this {
		this.data.url = url;
		return this;
	}

	/**
	 * Clears the URL of this embed.
	 */
	public clearURL(): this {
		this.data.url = undefined;
		return this;
	}

	/**
	 * Serializes this builder to API-compatible JSON data.
	 *
	 * Note that by disabling validation, there is no guarantee that the resulting object will be valid.
	 *
	 * @param validationOverride - Force validation to run/not run regardless of your global preference
	 */
	public toJSON(validationOverride?: boolean): APIEmbed {
		// This already fulfils all of our copy needs
		const data = {
			...this.data,
			// Disable validation because the embedPredicate below will validate those as well
			author: this.data.author?.toJSON(false),
			fields: this.data.fields?.map((field) => field.toJSON(false)),
			footer: this.data.footer?.toJSON(false),
		};

		if (validationOverride ?? isValidationEnabled()) {
			embedPredicate.parse(data);
		}

		return data;
	}
}
